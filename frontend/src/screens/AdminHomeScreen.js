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
import { getAdminStats } from '../api/admin';
import { useSilentPolling } from '../utils/useSilentPolling';

export default function AdminHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    try {
      const res = await getAdminStats();
      setStats(res.data?.data || {});
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting} numberOfLines={1}>Admin: {user?.fullName || ''}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thống kê hệ thống</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalUsers ?? '-'}</Text>
            <Text style={styles.statLabel}>Tổng user</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.elderlyCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Người cao tuổi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.caregiverCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Người chăm sóc</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.prescriptionCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Đơn thuốc</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.checkInCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Điểm danh</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.alertCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Cảnh báo</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => navigation.navigate('AdminUsers')}
      >
        <Text style={styles.menuBtnText}>👥 Quản lý người dùng</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => navigation.navigate('AdminConfig')}
      >
        <Text style={styles.menuBtnText}>⚙️ Cấu hình hệ thống</Text>
      </TouchableOpacity>
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
  headerActions: { flexDirection: 'row', flexWrap: 'wrap' },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#fff', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#0f766e' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statBox: {
    width: '33.33%',
    padding: 6,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#0f766e' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  menuBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuBtnText: { fontSize: 16, fontWeight: '600', color: '#111' },
});
