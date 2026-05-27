import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getLinkedElderly, unlinkElderly } from '../api/users';
import { getByCaregiver, getUnreadCount } from '../api/alerts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../api/chat';
import { useSilentPolling } from '../utils/useSilentPolling';

export default function CaregiverHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [elderly, setElderly] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    if (!user?.id) return;
    try {
      const [elderlyRes, alertsRes, countRes] = await Promise.all([
        getLinkedElderly(user.id),
        getByCaregiver(user.id),
        getUnreadCount(user.id),
      ]);
      setElderly(elderlyRes.data?.data || []);
      setAlerts(alertsRes.data?.data || []);
      setUnreadCount(countRes.data?.data ?? 0);
    } catch (e) {
      if (!silent) console.warn(e);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useSilentPolling(load, [user?.id], 3000, false);

  // realtime alerts sync (no reload)
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
            client.subscribe(`/topic/alerts/${user.id}`, (msg) => {
              try {
                const body = JSON.parse(msg.body);
                setAlerts((prev) => {
                  const idx = prev.findIndex((a) => a.id === body.id);
                  const next = idx >= 0 ? [...prev] : [body, ...prev];
                  if (idx >= 0) next[idx] = body;
                  return next;
                });
                if (body?.isRead === false) {
                  setUnreadCount((c) => c + 1);
                }
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sortedAlerts = useMemo(() => {
    const list = [...(alerts || [])];
    list.sort((a, b) => {
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [alerts]);

  const openLocation = (lat, lng) => {
    if (lat != null && lng != null) {
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
    }
  };

  const handleUnlink = async (e) => {
    const confirmed = await showAlert({
      title: 'Hủy liên kết',
      message: `Bạn có chắc muốn hủy liên kết với ${e.fullName || 'người cao tuổi này'}? Bạn sẽ không còn xem được dữ liệu chăm sóc của họ.`,
      type: 'confirm',
      showCancel: true,
      confirmText: 'Hủy liên kết',
      cancelText: 'Giữ liên kết',
    });
    if (!confirmed) return;
    try {
      await unlinkElderly(e.id);
      showAlert({
        title: 'Đã hủy liên kết',
        message: 'Liên kết đã được gỡ bỏ.',
        type: 'success',
      });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không hủy được liên kết';
      showAlert({ title: 'Lỗi', message: msg, type: 'error' });
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
          <TouchableOpacity style={styles.chatbotBtn} onPress={() => navigation.navigate('Chatbot')}>
            <Text style={styles.chatbotBtnText}>💊 Thuốc</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => navigation.navigate('Alerts')}
        >
          <Text style={styles.alertBannerText}>
            Có {unreadCount} cảnh báo chưa đọc
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Người cao tuổi đang chăm sóc</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LinkElderly')}>
            <Text style={styles.link}>Liên kết thêm</Text>
          </TouchableOpacity>
        </View>
        {elderly.length === 0 ? (
          <Text style={styles.empty}>Chưa liên kết ai. Bấm Liên kết thêm để thêm.</Text>
        ) : (
          elderly.map((e) => (
            <View key={e.id} style={styles.elderlyRow}>
              <TouchableOpacity
                style={styles.elderlyItem}
                onPress={() => navigation.navigate('ElderlyDetail', { elderlyId: e.id, elderlyName: e.fullName })}
              >
                <Text style={styles.elderlyName}>{e.fullName}</Text>
                <Text style={styles.elderlyEmail}>{e.email}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={() => handleUnlink(e)}
                accessibilityRole="button"
                accessibilityLabel="Hủy liên kết"
              >
                <Text style={styles.unlinkText}>Hủy liên kết</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Cảnh báo gần đây</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
            <Text style={styles.link}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        {alerts.length === 0 ? (
          <Text style={styles.empty}>Không có cảnh báo</Text>
        ) : (
          sortedAlerts.slice(0, 5).map((a) => {
            const hasLocation = a.latitude != null && a.longitude != null;
            const locStr = hasLocation ? `${a.latitude}, ${a.longitude}` : null;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.alertItem, !a.isRead && styles.alertUnread, !a.isRead && styles.alertUnreadBold]}
                onPress={() => navigation.navigate('Alerts')}
                activeOpacity={0.7}
              >
                {!a.isRead && <View style={styles.alertDot} />}
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, !a.isRead && styles.alertTitleUnread]}>{a.title}</Text>
                  <Text style={styles.alertMsg} numberOfLines={2}>{a.message}</Text>
                  {hasLocation && (
                    <TouchableOpacity
                      style={styles.alertLocation}
                      onPress={(e) => { e.stopPropagation(); openLocation(a.latitude, a.longitude); }}
                    >
                      <Text style={styles.alertLocationText}>📍 Vị trí: NCT — {locStr} (Bấm mở bản đồ)</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.alertTime}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    padding: 16,
    backgroundColor: '#0f766e',
  },
  greeting: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 10 },
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
  logoutBtn: { padding: 8 },
  logoutText: { color: '#fff', fontSize: 14 },
  alertBanner: {
    backgroundColor: '#dc2626',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  alertBannerText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  link: { color: '#0f766e', fontSize: 14 },
  empty: { color: '#999' },
  elderlyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
    gap: 8,
  },
  elderlyItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  unlinkBtn: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  unlinkText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  elderlyName: { fontSize: 16, fontWeight: '600' },
  elderlyEmail: { fontSize: 12, color: '#666' },
  alertItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'flex-start' },
  alertUnread: { backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  alertUnreadBold: { borderBottomColor: '#fecaca' },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 10, marginTop: 6 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600' },
  alertTitleUnread: { color: '#dc2626', fontWeight: '700' },
  alertLocation: { marginTop: 6 },
  alertLocationText: { fontSize: 12, color: '#0f766e', fontWeight: '500', textDecorationLine: 'underline' },
  alertMsg: { fontSize: 12, color: '#666', marginTop: 4 },
  alertTime: { fontSize: 11, color: '#999', marginTop: 4 },
});
