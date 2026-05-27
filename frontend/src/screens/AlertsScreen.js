import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getByCaregiver, markAsRead } from '../api/alerts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../api/chat';
import { useSilentPolling } from '../utils/useSilentPolling';

export default function AlertsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    if (!user?.id) return;
    try {
      const res = await getByCaregiver(user.id);
      setList(res.data?.data || []);
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
                setList((prev) => {
                  const idx = prev.findIndex((a) => a.id === body.id);
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

  const handleMarkRead = async (item) => {
    if (item.isRead) return;
    try {
      await markAsRead(item.id);
      setList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isRead: true } : a))
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const sortedList = useMemo(() => {
    const arr = [...(list || [])];
    arr.sort((a, b) => {
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return arr;
  }, [list]);

  const openLocation = (lat, lng) => {
    if (lat != null && lng != null) {
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cảnh báo</Text>
      </View>
      <FlatList
        data={sortedList}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Không có cảnh báo</Text>}
        renderItem={({ item }) => {
          const hasLocation = item.latitude != null && item.longitude != null;
          const locStr = hasLocation ? `${item.latitude}, ${item.longitude}` : null;
          return (
            <TouchableOpacity
              style={[styles.item, !item.isRead && styles.itemUnread, !item.isRead && styles.itemUnreadBold]}
              onPress={() => handleMarkRead(item)}
              activeOpacity={0.7}
            >
              {!item.isRead && <View style={styles.itemDot} />}
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>{item.title}</Text>
                <Text style={styles.itemMsg}>{item.message}</Text>
                {hasLocation && (
                  <TouchableOpacity
                    style={styles.itemLocation}
                    onPress={(e) => { e.stopPropagation(); openLocation(item.latitude, item.longitude); }}
                  >
                    <Text style={styles.itemLocationText}>📍 Vị trí NCT: {locStr} (Bấm mở bản đồ)</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.itemTime}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
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
  title: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#999',
  },
  item: {
    backgroundColor: '#fff',
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemUnread: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  itemUnreadBold: { borderWidth: 1, borderColor: '#fecaca' },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 10, marginTop: 6 },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemTitleUnread: { color: '#dc2626', fontWeight: '700', fontSize: 17 },
  itemLocation: { marginTop: 8 },
  itemLocationText: { fontSize: 13, color: '#0f766e', fontWeight: '500', textDecorationLine: 'underline' },
  itemMsg: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
