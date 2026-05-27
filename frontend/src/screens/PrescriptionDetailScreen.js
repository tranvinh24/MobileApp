import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { deleteMedication, deleteSchedule, getById, remove, update } from '../api/prescriptions';
import { useAlert } from '../utils/showAlert';
import { useAuth } from '../context/AuthContext';
import { useSilentPolling } from '../utils/useSilentPolling';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

export default function PrescriptionDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState(null);

  const load = async ({ silent } = {}) => {
    if (!id) return;
    try {
      const res = await getById(id);
      setPrescription(res.data?.data || null);
    } catch (e) {
      if (!silent) console.warn(e);
      setPrescription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useSilentPolling(load, [id], 3000, false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Không tìm thấy đơn thuốc</Text>
      </View>
    );
  }

  const meds = prescription.medications || [];
  const isCaregiver = user?.role === 'CAREGIVER';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{prescription.title}</Text>
        <Text style={styles.meta}>Bác sĩ: {prescription.doctorName || '—'}</Text>
        <Text style={styles.meta}>
          Thời gian: {formatDate(prescription.startDate)} → {formatDate(prescription.endDate)}
        </Text>
        {prescription.notes ? (
          <Text style={styles.notes}>{prescription.notes}</Text>
        ) : null}

        {isCaregiver && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('EditPrescription', { id: prescription.id })}
            >
              <Text style={styles.actionBtnText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => {
                Alert.alert('Xoá đơn thuốc', 'Bạn chắc chắn muốn xoá đơn thuốc này?', [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Xoá',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await remove(prescription.id);
                        showAlert({ title: 'Đã xóa', message: 'Đơn thuốc đã được xóa', type: 'success' });
                        navigation.goBack();
                      } catch (e) {
                        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không xóa được', type: 'error' });
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.actionBtnTextDanger}>Xoá</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thuốc ({meds.length})</Text>
        {meds.length === 0 ? (
          <Text style={styles.empty}>Chưa có thuốc trong đơn</Text>
        ) : (
          meds.map((m) => (
            <View key={m.id} style={styles.medItem}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medDosage}>
                Liều: {m.dosage || '—'} {m.unit ? `(${m.unit})` : ''}
              </Text>
              {m.quantity > 1 && (
                <Text style={styles.medMeta}>Số lượng: {m.quantity}</Text>
              )}
              {m.instructions ? (
                <Text style={styles.medInstructions}>{m.instructions}</Text>
              ) : null}
              {isCaregiver && m.schedules?.length > 0 && (
                <View style={styles.schedules}>
                  <Text style={styles.scheduleLabel}>Lịch uống:</Text>
                  {m.schedules.map((s) => (
                    <View key={s.id} style={styles.scheduleRow}>
                      <Text style={styles.scheduleItem}>
                        {s.timeOfDay?.substring?.(0, 5) || s.timeOfDay} — Hàng ngày
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Xoá lịch', 'Xoá lịch uống này?', [
                            { text: 'Hủy', style: 'cancel' },
                            {
                              text: 'Xoá',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await deleteSchedule(s.id);
                                  await load();
                                } catch (e) {
                                  showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không xóa được', type: 'error' });
                                }
                              },
                            },
                          ]);
                        }}
                      >
                        <Text style={styles.delSmall}>Xoá</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {isCaregiver && (
                <TouchableOpacity
                  style={styles.delMedBtn}
                  onPress={() => {
                    Alert.alert('Xoá thuốc', 'Xoá thuốc này khỏi đơn?', [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Xoá',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteMedication(m.id);
                            await load();
                          } catch (e) {
                            showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không xóa được', type: 'error' });
                          }
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.delMedText}>Xoá thuốc</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  empty: { color: '#999', padding: 24, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#0f766e', marginBottom: 8 },
  meta: { fontSize: 14, color: '#666', marginBottom: 4 },
  notes: { fontSize: 14, color: '#555', marginTop: 12, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#0f766e', padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnDanger: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  actionBtnText: { color: '#fff', fontWeight: '800' },
  actionBtnTextDanger: { color: '#dc2626', fontWeight: '800' },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  medItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medName: { fontSize: 16, fontWeight: '600' },
  medDosage: { fontSize: 14, color: '#666', marginTop: 4 },
  medMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  medInstructions: { fontSize: 13, color: '#555', marginTop: 6 },
  schedules: { marginTop: 8 },
  scheduleLabel: { fontSize: 12, color: '#0f766e', fontWeight: '600' },
  scheduleItem: { fontSize: 12, color: '#666', marginTop: 2 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delSmall: { color: '#dc2626', fontWeight: '700', fontSize: 12, paddingVertical: 2, paddingLeft: 12 },
  delMedBtn: { marginTop: 10, alignSelf: 'flex-start' },
  delMedText: { color: '#dc2626', fontWeight: '800' },
});
