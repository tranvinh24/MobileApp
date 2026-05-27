import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAlert } from '../utils/showAlert';
import {
  addMedication,
  addSchedule,
  getById,
  update,
  updateMedication,
  updateSchedule,
} from '../api/prescriptions';

function toDisplayDate(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  const dd = String(x.getDate()).padStart(2, '0');
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const yyyy = x.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toIsoDate(display) {
  if (!display) return null;
  const parts = display.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeTimeInput(value) {
  const t = (value || '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] || 0);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export default function EditPrescriptionScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [medications, setMedications] = useState([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedUnit, setNewMedUnit] = useState('');
  const [newMedQty, setNewMedQty] = useState('1');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00');
  const [newMedReminder, setNewMedReminder] = useState('15');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getById(id);
      const p = res.data?.data;
      setTitle(p?.title || '');
      setDoctorName(p?.doctorName || '');
      setNotes(p?.notes || '');
      setStartDate(toDisplayDate(p?.startDate));
      setEndDate(toDisplayDate(p?.endDate));
      setMedications(
        (p?.medications || []).map((m) => ({
          id: m.id,
          name: m.name || '',
          dosage: m.dosage || '',
          unit: m.unit || '',
          quantity: String(m.quantity ?? 1),
          instructions: m.instructions || '',
          schedules: (m.schedules || []).map((s) => ({
            id: s.id,
            timeOfDay: (s.timeOfDay || '').toString().substring(0, 5) || '08:00',
            reminderMinutesBefore: String(s.reminderMinutesBefore ?? 15),
            isActive: s.isActive !== false,
          })),
        }))
      );
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được đơn thuốc', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Sửa đơn thuốc' });
    load();
  }, [id]);

  const save = async () => {
    if (!title.trim()) {
      showAlert({ title: 'Lỗi', message: 'Nhập tiêu đề đơn thuốc', type: 'error' });
      return;
    }
    for (const med of medications) {
      if (!med.name?.trim()) {
        showAlert({ title: 'Lỗi', message: 'Tên thuốc không được để trống', type: 'error' });
        return;
      }
      for (const sch of med.schedules || []) {
        if (!normalizeTimeInput(sch.timeOfDay)) {
          showAlert({ title: 'Lỗi', message: `Giờ uống không hợp lệ cho thuốc ${med.name}`, type: 'error' });
          return;
        }
      }
    }
    if (newMedName.trim()) {
      if (!normalizeTimeInput(newMedTime)) {
        showAlert({ title: 'Lỗi', message: 'Giờ uống của thuốc mới không hợp lệ (hh:mm)', type: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      await update(id, {
        title: title.trim(),
        doctorName: doctorName.trim() || null,
        notes: notes.trim() || null,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
      });

      for (const med of medications) {
        const medPayload = {
          name: med.name.trim(),
          dosage: med.dosage.trim() || null,
          unit: med.unit.trim() || null,
          quantity: Number(med.quantity) || 1,
          instructions: med.instructions.trim() || null,
        };

        let targetMedicationId = med.id;
        if (targetMedicationId) {
          await updateMedication(targetMedicationId, medPayload);
        } else {
          // Defensive fallback: if item has no id, create it instead of calling update with invalid id.
          const createdMedRes = await addMedication(id, medPayload);
          targetMedicationId = createdMedRes.data?.data?.id;
        }

        for (const sch of med.schedules || []) {
          const schedulePayload = {
            timeOfDay: normalizeTimeInput(sch.timeOfDay),
            reminderMinutesBefore: Number(sch.reminderMinutesBefore) || 15,
            isActive: sch.isActive !== false,
          };
          if (sch.id) {
            await updateSchedule(sch.id, schedulePayload);
          } else if (targetMedicationId) {
            await addSchedule(targetMedicationId, schedulePayload.timeOfDay, schedulePayload.reminderMinutesBefore);
          }
        }
      }

      if (newMedName.trim()) {
        const medRes = await addMedication(id, {
          name: newMedName.trim(),
          dosage: newMedDosage.trim() || null,
          unit: newMedUnit.trim() || null,
          quantity: Number(newMedQty) || 1,
          instructions: newMedInstructions.trim() || null,
        });
        const created = medRes.data?.data;
        if (created?.id) {
          await addSchedule(
            created.id,
            normalizeTimeInput(newMedTime) || '08:00:00',
            Number(newMedReminder) || 15
          );
        }
      }

      showAlert({ title: 'Thành công', message: 'Đã cập nhật đơn thuốc', type: 'success' });
      navigation.goBack();
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không lưu được', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Thông tin đơn thuốc</Text>
      <Text style={styles.label}>Tiêu đề</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="vd: Đơn thuốc tháng 3" />

      <Text style={styles.label}>Bác sĩ</Text>
      <TextInput style={styles.input} value={doctorName} onChangeText={setDoctorName} placeholder="vd: BS Nguyễn Văn A" />

      <Text style={styles.label}>Từ ngày</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
        <Text>{startDate || 'Chọn ngày (dd/MM/yyyy)'}</Text>
      </TouchableOpacity>
      {showStartPicker && (
        <DateTimePicker
          mode="date"
          value={new Date()}
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(toDisplayDate(date));
          }}
        />
      )}

      <Text style={styles.label}>Đến ngày</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
        <Text>{endDate || 'Chọn ngày (dd/MM/yyyy) hoặc để trống'}</Text>
      </TouchableOpacity>
      {showEndPicker && (
        <DateTimePicker
          mode="date"
          value={new Date()}
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(toDisplayDate(date));
          }}
        />
      )}

      <Text style={styles.label}>Ghi chú</Text>
      <TextInput style={[styles.input, styles.multi]} value={notes} onChangeText={setNotes} placeholder="..." multiline />

      <Text style={styles.sectionTitle}>Thuốc hiện có</Text>
      {medications.length === 0 ? (
        <Text style={styles.empty}>Đơn thuốc này chưa có thuốc.</Text>
      ) : (
        medications.map((med, idx) => (
          <View key={med.id} style={styles.medCard}>
            <Text style={styles.medTitle}>Thuốc #{idx + 1}</Text>
            <Text style={styles.label}>Tên thuốc *</Text>
            <TextInput
              style={styles.input}
              value={med.name}
              onChangeText={(v) =>
                setMedications((prev) => prev.map((x) => (x.id === med.id ? { ...x, name: v } : x)))
              }
              placeholder="vd: Paracetamol"
            />
            <Text style={styles.label}>Liều lượng</Text>
            <TextInput
              style={styles.input}
              value={med.dosage}
              onChangeText={(v) =>
                setMedications((prev) => prev.map((x) => (x.id === med.id ? { ...x, dosage: v } : x)))
              }
              placeholder="vd: 500mg x 2 viên"
            />
            <Text style={styles.label}>Đơn vị</Text>
            <TextInput
              style={styles.input}
              value={med.unit}
              onChangeText={(v) =>
                setMedications((prev) => prev.map((x) => (x.id === med.id ? { ...x, unit: v } : x)))
              }
              placeholder="vd: viên"
            />
            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              value={med.quantity}
              onChangeText={(v) =>
                setMedications((prev) => prev.map((x) => (x.id === med.id ? { ...x, quantity: v } : x)))
              }
              keyboardType="number-pad"
              placeholder="1"
            />
            <Text style={styles.label}>Hướng dẫn</Text>
            <TextInput
              style={[styles.input, styles.multiSmall]}
              value={med.instructions}
              onChangeText={(v) =>
                setMedications((prev) => prev.map((x) => (x.id === med.id ? { ...x, instructions: v } : x)))
              }
              multiline
              placeholder="Uống sau ăn..."
            />
            {(med.schedules || []).map((sch, sIdx) => (
              <View key={sch.id} style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>Lịch uống #{sIdx + 1}</Text>
                <Text style={styles.label}>Giờ uống</Text>
                <TextInput
                  style={styles.input}
                  value={sch.timeOfDay}
                  onChangeText={(v) =>
                    setMedications((prev) =>
                      prev.map((x) =>
                        x.id !== med.id
                          ? x
                          : {
                              ...x,
                              schedules: x.schedules.map((k) =>
                                k.id === sch.id ? { ...k, timeOfDay: v } : k
                              ),
                            }
                      )
                    )
                  }
                  placeholder="08:00"
                />
                <Text style={styles.label}>Nhắc trước (phút)</Text>
                <TextInput
                  style={styles.input}
                  value={sch.reminderMinutesBefore}
                  onChangeText={(v) =>
                    setMedications((prev) =>
                      prev.map((x) =>
                        x.id !== med.id
                          ? x
                          : {
                              ...x,
                              schedules: x.schedules.map((k) =>
                                k.id === sch.id ? { ...k, reminderMinutesBefore: v } : k
                              ),
                            }
                      )
                    )
                  }
                  keyboardType="number-pad"
                  placeholder="15"
                />
              </View>
            ))}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Thêm thuốc mới (tùy chọn)</Text>
      <Text style={styles.label}>Tên thuốc</Text>
      <TextInput style={styles.input} value={newMedName} onChangeText={setNewMedName} placeholder="vd: Vitamin C" />
      <Text style={styles.label}>Liều lượng</Text>
      <TextInput style={styles.input} value={newMedDosage} onChangeText={setNewMedDosage} placeholder="vd: 1 viên" />
      <Text style={styles.label}>Đơn vị</Text>
      <TextInput style={styles.input} value={newMedUnit} onChangeText={setNewMedUnit} placeholder="vd: viên" />
      <Text style={styles.label}>Số lượng</Text>
      <TextInput style={styles.input} value={newMedQty} onChangeText={setNewMedQty} keyboardType="number-pad" placeholder="1" />
      <Text style={styles.label}>Hướng dẫn</Text>
      <TextInput
        style={[styles.input, styles.multiSmall]}
        value={newMedInstructions}
        onChangeText={setNewMedInstructions}
        multiline
        placeholder="Uống sau ăn..."
      />
      <Text style={styles.label}>Giờ uống</Text>
      <TextInput style={styles.input} value={newMedTime} onChangeText={setNewMedTime} placeholder="08:00" />
      <Text style={styles.label}>Nhắc trước (phút)</Text>
      <TextInput
        style={styles.input}
        value={newMedReminder}
        onChangeText={setNewMedReminder}
        keyboardType="number-pad"
        placeholder="15"
      />

      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.btnText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 28 },
  sectionTitle: { fontSize: 16, color: '#0f766e', fontWeight: '800', marginTop: 10, marginBottom: 8 },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15 },
  multi: { minHeight: 100, textAlignVertical: 'top' },
  multiSmall: { minHeight: 70, textAlignVertical: 'top' },
  medCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginTop: 8 },
  medTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  scheduleCard: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scheduleTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  btn: { marginTop: 16, backgroundColor: '#0f766e', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  empty: { color: '#9ca3af' },
});

