import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getByElderly } from '../api/prescriptions';
import { getByElderly as getCheckIns } from '../api/checkIns';
import { getByElderly as getMedHistory } from '../api/medicationHistory';
import { confirmTaken, skip } from '../api/medicationHistory';
import { sendSos } from '../api/alerts';
import { create } from '../api/checkIns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../api/chat';
import { useSilentPolling } from '../utils/useSilentPolling';

const DAY_ABBREV = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function buildTodaysSlots(prescriptions, takenKeys, optimisticTaken = new Set()) {
  const today = new Date();
  const dayAbbrev = DAY_ABBREV[today.getDay()];
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const slots = [];
  (prescriptions || []).forEach((p) => {
    (p.medications || []).forEach((m) => {
      (m.schedules || []).forEach((s) => {
        if (!s.isActive) return;
        const dow = (s.dayOfWeek || 'ALL').toUpperCase();
        if (dow !== 'ALL' && !dow.split(/[,\s]+/).includes(dayAbbrev)) return;

        const timeStr = (s.timeOfDay || '08:00').toString();
        const t = timeStr.length >= 5 ? timeStr.substring(0, 5) : '08:00';
        const scheduledTime = `${dateStr}T${t}:00`;
        const key = `${s.id}-${dateStr}T${t}`;
        slots.push({
          key,
          scheduleId: s.id,
          scheduledTime,
          name: m.name,
          dosage: m.dosage || m.unit || '',
          timeLabel: t,
          taken: takenKeys.has(key) || optimisticTaken.has(key),
        });
      });
    });
  });
  slots.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  return slots;
}

export default function ElderlyHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [prescriptions, setPrescriptions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [medHistory, setMedHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [optimisticTaken, setOptimisticTaken] = useState(new Set());

  const load = async () => {
    if (!user?.id) return;
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const [presRes, checkRes, histRes] = await Promise.all([
        getByElderly(user.id),
        getCheckIns(user.id),
        getMedHistory(user.id, start, end).catch(() => ({ data: { data: [] } })),
      ]);
      setPrescriptions(presRes.data?.data || []);
      setCheckIns(checkRes.data?.data || []);
      setMedHistory(histRes.data?.data || []);
      setOptimisticTaken(new Set());
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // fallback polling: keeps UI fresh if WS drops
  useSilentPolling(load, [user?.id], 3000, false);

  // realtime sync for check-ins + medication history (no pull-to-refresh)
  useEffect(() => {
    let active = true;
    const connect = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !user?.id) return;
        const client = new Client({
          reconnectDelay: 2000,
          webSocketFactory: () =>
            new WebSocket(WS_URL, undefined, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          onConnect: () => {
            if (!active) return;
            client.subscribe(`/topic/checkins/${user.id}`, (msg) => {
              try {
                const body = JSON.parse(msg.body);
                setCheckIns((prev) => {
                  const idx = prev.findIndex((c) => c.id === body.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = body;
                    return next;
                  }
                  return [body, ...(prev || [])];
                });
              } catch {}
            });
            client.subscribe(`/topic/med-history/${user.id}`, (msg) => {
              try {
                const body = JSON.parse(msg.body);
                setMedHistory((prev) => {
                  // replace if same scheduleId + scheduledTime, else prepend
                  const sid = body.medicationScheduleId;
                  const st = body.scheduledTime;
                  if (!sid || !st) return prev;
                  const idx = (prev || []).findIndex((h) =>
                    String(h.medicationScheduleId || h.medicationSchedule?.id) === String(sid) &&
                    String(h.scheduledTime) === String(st)
                  );
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = body;
                    return next;
                  }
                  return [body, ...(prev || [])];
                });
              } catch {}
            });
          },
        });
        client.activate();
        return client;
      } catch {
        return null;
      }
    };

    let stomp = null;
    connect().then((c) => { stomp = c; });
    return () => {
      active = false;
      try { stomp?.deactivate(); } catch {}
    };
  }, [user?.id]);

  const takenKeys = useMemo(() => {
    const set = new Set();
    const norm = (s) => (s || '').replace(/\.\d+Z?$/, '').substring(0, 16);
    (medHistory || []).forEach((h) => {
      const sid = h.medicationScheduleId || h.medicationSchedule?.id;
      if (sid && h.scheduledTime) set.add(`${sid}-${norm(h.scheduledTime)}`);
    });
    return set;
  }, [medHistory]);

  const todaysSlots = useMemo(
    () => buildTodaysSlots(prescriptions, takenKeys, optimisticTaken),
    [prescriptions, takenKeys, optimisticTaken]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    try {
      await create(user.id, 'ACTIVE', 'Điểm danh chủ động', null, null);
      showAlert({ title: 'Thành công', message: 'Đã điểm danh an toàn', type: 'success', onConfirm: load });
    } catch (e) {
      const msg = e.response?.data?.message || 'Không thể điểm danh';
      showAlert({ title: 'Lỗi', message: msg, type: 'error' });
    }
  };

  const handleConfirmMed = async (slot) => {
    if (slot.taken) return;
    setConfirming(slot.key);
    setOptimisticTaken((prev) => new Set(prev).add(slot.key));
    try {
      await confirmTaken(slot.scheduleId, slot.scheduledTime);
      await load();
    } catch (e) {
      setOptimisticTaken((prev) => {
        const s = new Set(prev);
        s.delete(slot.key);
        return s;
      });
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không thể xác nhận', type: 'error' });
    } finally {
      setConfirming(null);
    }
  };

  const handleSkipMed = async (slot) => {
    if (slot.taken) return;
    setConfirming(slot.key);
    try {
      await skip(slot.scheduleId, slot.scheduledTime, 'SKIPPED');
      await load();
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không thể bỏ qua', type: 'error' });
    } finally {
      setConfirming(null);
    }
  };

  const [sosSending, setSosSending] = useState(false);
  const handleSos = async () => {
    if (sosSending) return;
    setSosSending(true);
    try {
      let lat = null;
      let lng = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        }
      } catch (_) {}
      await sendSos(user.id, lat, lng);
      showAlert({ title: 'Đã gửi', message: 'Đã gửi tín hiệu khẩn cấp đến người giám hộ', type: 'success' });
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không thể gửi SOS', type: 'error' });
    } finally {
      setSosSending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting} numberOfLines={1}>Xin chào, {user?.fullName || ''}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.chatbotBtn} onPress={() => navigation.navigate('Account')}>
            <Text style={styles.chatbotBtnText}>👤 TK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatbotBtn} onPress={() => navigation.navigate('ChatList')}>
            <Text style={styles.chatbotBtnText}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatbotBtn} onPress={() => navigation.navigate('HealthTimeline', { elderlyId: user?.id, elderlyName: user?.fullName })}>
            <Text style={styles.chatbotBtnText}>🩺 Sức khoẻ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatbotBtn} onPress={() => navigation.navigate('Chatbot')}>
            <Text style={styles.chatbotBtnText}>💊 Thuốc</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Điểm danh sức khỏe</Text>
        <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
          <Text style={styles.checkInText}>Điểm danh hôm nay</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Lịch sử: {checkIns.length} lần gần đây</Text>
      </View>

      {todaysSlots.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thuốc hôm nay</Text>
          </View>
          {todaysSlots.map((slot) => (
            <View key={slot.key} style={styles.medSlot}>
              <View style={styles.medSlotInfo}>
                <Text style={styles.medSlotName}>{slot.name}</Text>
                <Text style={styles.medSlotMeta}>
                  {slot.timeLabel} {slot.dosage ? `• ${slot.dosage}` : ''}
                </Text>
              </View>
              {slot.taken ? (
                <View style={styles.medSlotDoneWrap}>
                  <Text style={styles.medSlotDone}>✓ Đã uống</Text>
                </View>
              ) : (
                <View style={styles.medSlotRight}>
                  <Text style={styles.medSlotPending}>Chưa uống</Text>
                  {user?.role === 'CAREGIVER' && (
                    <TouchableOpacity
                      style={[styles.medSlotSkipBtn, confirming === slot.key && styles.medSlotBtnDisabled]}
                      onPress={() => handleSkipMed(slot)}
                      disabled={confirming === slot.key}
                    >
                      <Text style={styles.medSlotSkipText}>Bỏ qua</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.medSlotBtn, confirming === slot.key && styles.medSlotBtnDisabled]}
                    onPress={() => handleConfirmMed(slot)}
                    disabled={confirming === slot.key}
                  >
                    {confirming === slot.key ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.medSlotBtnText}>Đã uống</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Đơn thuốc</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Prescriptions')}>
            <Text style={styles.link}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        {prescriptions.length === 0 ? (
          <Text style={styles.empty}>Chưa có đơn thuốc</Text>
        ) : (
          prescriptions.slice(0, 3).map((p) => (
            <View key={p.id} style={styles.presItem}>
              <Text style={styles.presTitle}>{p.title}</Text>
              <Text style={styles.presSub}>{p.doctorName || 'Không rõ bác sĩ'}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={[styles.sosBtn, sosSending && styles.sosBtnDisabled]}
        onPress={handleSos}
        disabled={sosSending}
      >
        {sosSending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sosText}>🆘 SOS Khẩn cấp</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#0f766e',
  },
  greeting: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chatbotBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chatbotBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  link: {
    color: '#0f766e',
    fontSize: 14,
  },
  checkInBtn: {
    backgroundColor: '#0f766e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  empty: {
    color: '#999',
  },
  presItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  presTitle: {
    fontSize: 16,
  },
  presSub: {
    fontSize: 12,
    color: '#666',
  },
  medSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medSlotInfo: { flex: 1 },
  medSlotName: { fontSize: 15, fontWeight: '600' },
  medSlotMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  medSlotRight: { alignItems: 'flex-end', gap: 8 },
  medSlotPending: { fontSize: 13, color: '#9ca3af' },
  medSlotBtn: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  medSlotBtnDisabled: { opacity: 0.7 },
  medSlotBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  medSlotSkipBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  medSlotSkipText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  medSlotDoneWrap: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  medSlotDone: { color: '#15803d', fontSize: 14, fontWeight: '700' },
  sosBtn: {
    backgroundColor: '#dc2626',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sosBtnDisabled: { opacity: 0.8 },
  sosText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
