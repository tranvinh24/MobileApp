import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getElderlyProfile } from '../api/users';
import { getByElderly } from '../api/prescriptions';
import { getByElderly as getCheckIns } from '../api/checkIns';
import { getByElderly as getMedHistory, confirmTaken } from '../api/medicationHistory';
import { getByCaregiver } from '../api/alerts';
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

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const today = new Date();
  if (dt.toDateString() === today.toDateString()) {
    return 'Hôm nay ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return dt.toLocaleDateString('vi-VN') + ' ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

export default function ElderlyDetailScreen({ route, navigation }) {
  const { elderlyId } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [medHistory, setMedHistory] = useState([]);
  const [confirming, setConfirming] = useState(null);
  const [optimisticTaken, setOptimisticTaken] = useState(new Set());
  const { showAlert } = useAlert();

  const load = async ({ silent } = {}) => {
    if (!elderlyId || !user?.id) return;
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const [profileRes, presRes, checkRes, alertsRes, histRes] = await Promise.all([
        getElderlyProfile(elderlyId),
        getByElderly(elderlyId),
        getCheckIns(elderlyId, 15),
        getByCaregiver(user.id, 100),
        getMedHistory(elderlyId, start, end).catch(() => ({ data: { data: [] } })),
      ]);
      setProfile(profileRes.data?.data || null);
      setPrescriptions(presRes.data?.data || []);
      setCheckIns(checkRes.data?.data || []);
      const allAlerts = alertsRes.data?.data || [];
      setAlerts(allAlerts.filter((a) => String(a.elderlyId) === String(elderlyId)));
      setMedHistory(histRes.data?.data || []);
      setOptimisticTaken(new Set());
    } catch (e) {
      if (!silent) console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [elderlyId, user?.id]);

  // fallback polling: keeps UI fresh if WS drops
  useSilentPolling(load, [elderlyId, user?.id], 3000, false);

  // realtime check-in sync for this elderly (no reload)
  useEffect(() => {
    let active = true;
    const connect = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !elderlyId) return;
        const client = new Client({
          reconnectDelay: 2000,
          webSocketFactory: () =>
            new WebSocket(WS_URL, undefined, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          onConnect: () => {
            if (!active) return;
            client.subscribe(`/topic/checkins/${elderlyId}`, (msg) => {
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
  }, [elderlyId]);

  // realtime medication history sync for this elderly (no reload)
  useEffect(() => {
    let active = true;
    const connect = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !elderlyId) return;
        const client = new Client({
          reconnectDelay: 2000,
          webSocketFactory: () =>
            new WebSocket(WS_URL, undefined, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          onConnect: () => {
            if (!active) return;
            client.subscribe(`/topic/med-history/${elderlyId}`, (msg) => {
              try {
                const body = JSON.parse(msg.body);
                setMedHistory((prev) => {
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
  }, [elderlyId]);

  useFocusEffect(
    useCallback(() => {
      if (elderlyId) load();
    }, [elderlyId])
  );

  const elderlyUser = profile?.user;
  useEffect(() => {
    navigation.setOptions({ title: elderlyUser?.fullName || 'Chi tiết' });
  }, [elderlyUser?.fullName, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const lastCheckin = checkIns[0];
  const today = new Date().toDateString();
  const checkedInToday = lastCheckin && new Date(lastCheckin.checkedAt).toDateString() === today;

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (!elderlyUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Không tìm thấy thông tin</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header card - Trạng thái */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(elderlyUser.fullName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{elderlyUser.fullName}</Text>
        <View style={[styles.statusBadge, checkedInToday ? styles.statusSafe : styles.statusWarning]}>
          <Text style={styles.statusText}>
            {checkedInToday ? '✓ An toàn' : '⚠ Cần chú ý'}
          </Text>
        </View>
        <Text style={styles.statusHint}>
          {checkedInToday
            ? 'Đã điểm danh hôm nay'
            : 'Chưa điểm danh hôm nay'}
        </Text>
      </View>

      {user?.role === 'CAREGIVER' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('EditElderlyProfile', { elderlyId, elderlyName: elderlyUser.fullName })}
          >
            <Text style={styles.actionBtnText}>✏️ Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AddPrescription', { elderlyId, elderlyName: elderlyUser.fullName })}
          >
            <Text style={styles.actionBtnText}>➕ Thêm đơn thuốc</Text>
          </TouchableOpacity>
        </View>
      )}

      {user?.role === 'CAREGIVER' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={styles.actionBtnText}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HealthTimeline', { elderlyId, elderlyName: elderlyUser.fullName })}
          >
            <Text style={styles.actionBtnText}>🩺 Hồ sơ sức khoẻ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thông tin liên hệ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin liên hệ</Text>
        <InfoRow label="Email" value={elderlyUser.email} />
        <InfoRow label="Số điện thoại" value={elderlyUser.phone || '—'} />
        <InfoRow label="Liên hệ khẩn cấp" value={profile?.emergencyContact || '—'} />
      </View>

      {/* Thông tin cá nhân */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
        <InfoRow label="Ngày sinh" value={formatDateOnly(profile?.dateOfBirth)} />
        <InfoRow label="Địa chỉ" value={profile?.address || '—'} />
      </View>

      {/* Trạng thái hoạt động */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hoạt động gần đây</Text>
        <InfoRow label="Hoạt động lúc cuối" value={formatDate(profile?.lastActiveAt)} />
        <InfoRow label="Điểm danh lúc cuối" value={formatDate(profile?.lastCheckinAt)} />
      </View>

      {/* Thuốc hôm nay - Giám sát cập nhật đã uống */}
      {user?.role === 'CAREGIVER' && todaysSlots.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thuốc hôm nay</Text>
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

      {/* Ghi chú y tế */}
      {profile?.medicalNotes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ghi chú y tế</Text>
          <Text style={styles.notes}>{profile.medicalNotes}</Text>
        </View>
      )}

      {/* Đơn thuốc */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Đơn thuốc</Text>
          <Text style={styles.count}>{prescriptions.length} đơn</Text>
        </View>
        {prescriptions.length === 0 ? (
          <Text style={styles.empty}>Chưa có đơn thuốc</Text>
        ) : (
          prescriptions.slice(0, 5).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('PrescriptionDetail', { id: p.id })}
            >
              <Text style={styles.listTitle}>{p.title}</Text>
              <Text style={styles.listSub}>
                {p.doctorName || 'Không rõ bác sĩ'} • {p.medications?.length || 0} loại thuốc
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Lịch sử điểm danh */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Lịch sử điểm danh</Text>
          <Text style={styles.count}>{checkIns.length} lần gần đây</Text>
        </View>
        {checkIns.length === 0 ? (
          <Text style={styles.empty}>Chưa có lịch sử</Text>
        ) : (
          checkIns.slice(0, 7).map((c) => (
            <View key={c.id} style={styles.listItem}>
              <Text style={styles.listTitle}>
                {c.checkInType === 'ACTIVE' ? 'Chủ động' : 'Thụ động'}
              </Text>
              <Text style={styles.listSub}>{formatDate(c.checkedAt)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Cảnh báo */}
      {alerts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cảnh báo liên quan</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.link}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {alerts.slice(0, 5).map((a) => (
            <View key={a.id} style={[styles.alertItem, !a.isRead && styles.alertUnread]}>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <Text style={styles.alertMsg}>{a.message}</Text>
              <Text style={styles.alertTime}>{formatDate(a.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#0f766e',
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  statusSafe: {
    backgroundColor: '#22c55e',
  },
  statusWarning: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  actionRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#0f766e', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  count: {
    fontSize: 12,
    color: '#6b7280',
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
  medSlotDoneWrap: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  medSlotDone: { color: '#15803d', fontSize: 14, fontWeight: '700' },
  link: {
    fontSize: 14,
    color: '#0f766e',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  listSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  empty: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  alertItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  alertUnread: {
    backgroundColor: '#fef2f2',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  alertMsg: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
});
