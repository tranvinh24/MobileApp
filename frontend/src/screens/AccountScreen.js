import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api/users';
import { useSilentPolling } from '../utils/useSilentPolling';

const ROLE_LABELS = { ELDERLY: 'Người cao tuổi', CAREGIVER: 'Người chăm sóc' };

export default function AccountScreen({ navigation }) {
  const { user: authUser, logout, refreshUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    try {
      const res = await getMe();
      const u = res.data?.data;
      if (u) {
        setUser(u);
        await refreshUser();
      }
    } catch (e) {
      if (!silent) console.warn(e);
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

  const info = user || authUser;
  const roleLabel = ROLE_LABELS[info?.role] || info?.role || '-';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin tài khoản</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Họ và tên</Text>
          <Text style={styles.value}>{info?.fullName || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{info?.email || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Số điện thoại</Text>
          <Text style={styles.value}>{info?.phone || 'Chưa cập nhật'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vai trò</Text>
          <Text style={styles.value}>{roleLabel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('Devices')}
      >
        <Text style={styles.secondaryBtnText}>Thiết bị đăng nhập</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#0f766e',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500', color: '#111' },
  logoutBtn: {
    backgroundColor: '#dc2626',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryBtnText: { color: '#0f766e', fontSize: 16, fontWeight: '700' },
});
