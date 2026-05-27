import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAlert } from '../utils/showAlert';
import { createHealthEntry, deleteHealthEntry, getHealthEntries } from '../api/health';
import { useAuth } from '../context/AuthContext';
import { useSilentPolling } from '../utils/useSilentPolling';
import { formatViHealthNumber } from '../utils/healthFormat';
import HealthTrendChart from '../components/HealthTrendChart';

function fmt(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('vi-VN');
}

export default function HealthTimelineScreen({ route, navigation }) {
  const { elderlyId, elderlyName } = route.params || {};
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    if (!elderlyId) return;
    try {
      const res = await getHealthEntries(elderlyId, null, null, 200);
      setList(res.data?.data || []);
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được hồ sơ sức khoẻ', type: 'error' });
      }
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: elderlyName ? `Sức khoẻ: ${elderlyName}` : 'Hồ sơ sức khoẻ' });
    load();
  }, [elderlyId]);

  useSilentPolling(load, [elderlyId], 3000, false);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const canEdit = user?.role === 'CAREGIVER';

  const remove = (id) => {
    Alert.alert('Xoá bản ghi', 'Bạn chắc chắn muốn xoá?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHealthEntry(id);
            await load();
          } catch (e) {
            showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không xoá được', type: 'error' });
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {canEdit && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('HealthEntryForm', { elderlyId, elderlyName, mode: 'create' })}
        >
          <Text style={styles.addBtnText}>+ Thêm chỉ số</Text>
        </TouchableOpacity>
      )}

      {list.length > 0 ? <HealthTrendChart entries={list} /> : null}

      {list.map((e) => (
        <TouchableOpacity
          key={e.id}
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => canEdit && navigation.navigate('HealthEntryForm', { elderlyId, elderlyName, mode: 'edit', entry: e })}
        >
          <View style={styles.rowTop}>
            <Text style={styles.time}>{fmt(e.recordedAt)}</Text>
            {canEdit && (
              <TouchableOpacity onPress={() => remove(e.id)} style={styles.delBtn}>
                <Text style={styles.delText}>Xoá</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.meta}>Người ghi: {e.recordedByName || '—'}</Text>

          <View style={styles.grid}>
            <Info label="Huyết áp" value={e.systolic && e.diastolic ? `${formatViHealthNumber(e.systolic)}/${formatViHealthNumber(e.diastolic)}` : '—'} unit="mmHg" />
            <Info label="Nhịp tim" value={formatViHealthNumber(e.heartRate)} unit="bpm" />
            <Info label="Đường huyết" value={formatViHealthNumber(e.bloodGlucose)} unit="mmol/L" />
            <Info label="Nhiệt độ" value={formatViHealthNumber(e.temperature)} unit="°C" />
            <Info label="Cân nặng" value={formatViHealthNumber(e.weight)} unit="kg" />
          </View>

          {e.note ? <Text style={styles.note}>Ghi chú: {e.note}</Text> : null}
        </TouchableOpacity>
      ))}

      {list.length === 0 && (
        <Text style={styles.empty}>Chưa có bản ghi. {canEdit ? 'Bấm “Thêm chỉ số” để tạo.' : ''}</Text>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Info({ label, value, unit }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>
        {value} {value !== '—' ? <Text style={styles.unit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  box: { width: '48%', backgroundColor: '#f9fafb', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eef2f7' },
  boxLabel: { fontSize: 11, color: '#6b7280' },
  boxValue: { marginTop: 6, fontSize: 15, fontWeight: '800', color: '#0f766e' },
  unit: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  note: { marginTop: 10, color: '#374151' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  delText: { color: '#dc2626', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 24 },
});

