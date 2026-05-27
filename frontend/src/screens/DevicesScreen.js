import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useAlert } from '../utils/showAlert';
import { listMyDevices, revokeMyDevice } from '../api/devices';
import { useSilentPolling } from '../utils/useSilentPolling';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('vi-VN');
}

export default function DevicesScreen() {
  const { showAlert } = useAlert();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    try {
      const res = await listMyDevices();
      setList(res.data?.data || []);
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được thiết bị', type: 'error' });
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  useSilentPolling(load, [], 3000, false);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const revoke = (id) => {
    Alert.alert('Đăng xuất thiết bị', 'Bạn muốn đăng xuất thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeMyDevice(id);
            await load();
          } catch (e) {
            showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không đăng xuất được', type: 'error' });
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {list.map((d) => (
        <View key={d.id} style={styles.card}>
          <Text style={styles.title}>{d.deviceInfo || 'Thiết bị'}</Text>
          <Text style={styles.meta}>Platform: {d.platform || '—'}</Text>
          <Text style={styles.meta}>Last seen: {fmt(d.lastSeenAt)}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => revoke(d.id)}>
            <Text style={styles.btnText}>Đăng xuất thiết bị</Text>
          </TouchableOpacity>
        </View>
      ))}
      {list.length === 0 && <Text style={styles.empty}>Chưa có thiết bị nào.</Text>}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '800', color: '#0f766e' },
  meta: { marginTop: 6, color: '#6b7280' },
  btn: { marginTop: 12, backgroundColor: '#dc2626', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 24 },
});

