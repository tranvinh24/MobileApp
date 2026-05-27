import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../utils/showAlert';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useSilentPolling } from '../utils/useSilentPolling';

const ROLE_LABELS = { ELDERLY: 'NCT', CAREGIVER: 'CS', ADMIN: 'Admin' };

export default function AdminUsersScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(''); // '' | ELDERLY | CAREGIVER | ADMIN
  const [search, setSearch] = useState('');

  const load = async ({ silent } = {}) => {
    try {
      const res = await getAdminUsers();
      setUsers(res.data?.data || []);
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được danh sách', type: 'error' });
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  useSilentPolling(load, [], 3000, false);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let list = [...users];
    if (filter) list = list.filter((u) => u.role === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [users, filter, search]);

  const toggleActive = async (u) => {
    try {
      await updateAdminUser(u.id, { isActive: !u.isActive });
      await load();
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không cập nhật được', type: 'error' });
    }
  };

  const confirmDelete = async (u) => {
    const ok = await showAlert({
      title: 'Xóa tài khoản',
      message: `Xóa vĩnh viễn tài khoản ${u.fullName || u.email}? Hành động không thể hoàn tác.`,
      type: 'confirm',
      showCancel: true,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!ok) return;
    try {
      await deleteAdminUser(u.id);
      await load();
      showAlert({ title: 'Đã xóa', message: 'Tài khoản đã được xóa.', type: 'success' });
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không xóa được tài khoản', type: 'error' });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
        <View style={styles.filterRow}>
          {['', 'ELDERLY', 'CAREGIVER', 'ADMIN'].map((r) => (
            <TouchableOpacity
              key={r || 'all'}
              style={[styles.filterBtn, filter === r && styles.filterBtnActive]}
              onPress={() => setFilter(r)}
            >
              <Text style={[styles.filterBtnText, filter === r && styles.filterBtnTextActive]}>
                {r ? ROLE_LABELS[r] : 'Tất cả'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filtered.map((u) => (
        <View key={u.id} style={[styles.row, !u.isActive && styles.rowInactive]}>
          <View style={styles.rowBody}>
            <Text style={styles.rowName}>{u.fullName || '-'}</Text>
            <Text style={styles.rowEmail}>{u.email}</Text>
            <View style={styles.rowMeta}>
              <Text style={styles.roleBadge}>{ROLE_LABELS[u.role] || u.role}</Text>
              <Text style={u.isActive ? styles.activeText : styles.inactiveText}>
                {u.isActive ? 'Đang hoạt động' : 'Đã khóa'}
              </Text>
            </View>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.toggleBtn, !u.isActive && styles.toggleBtnInactive]}
              onPress={() => toggleActive(u)}
            >
              <Text style={styles.toggleBtnText}>{u.isActive ? 'Khóa' : 'Mở'}</Text>
            </TouchableOpacity>
            {currentUser?.id != null && Number(currentUser.id) !== Number(u.id) && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(u)}>
                <Text style={styles.deleteBtnText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      {filtered.length === 0 && (
        <Text style={styles.empty}>Không có người dùng nào.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  toolbar: { padding: 12, backgroundColor: '#fff', marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#0f766e' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  rowInactive: { opacity: 0.7 },
  rowBody: { flex: 1 },
  rowActions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  roleBadge: { fontSize: 11, backgroundColor: '#e0f2fe', color: '#0369a1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activeText: { fontSize: 12, color: '#16a34a' },
  inactiveText: { fontSize: 12, color: '#dc2626' },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f766e',
  },
  toggleBtnInactive: { backgroundColor: '#16a34a' },
  toggleBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  deleteBtnText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', padding: 24 },
});
