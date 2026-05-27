import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getElderlyProfile, updateElderlyProfile } from '../api/users';

function toDateStr(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export default function EditElderlyProfileScreen({ route, navigation }) {
  const { elderlyId } = route.params || {};
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  useEffect(() => {
    if (!elderlyId) return;
    const load = async () => {
      try {
        const res = await getElderlyProfile(elderlyId);
        const p = res.data?.data;
        if (p) {
          setAddress(p.address || '');
          setEmergencyContact(p.emergencyContact || '');
          setMedicalNotes(p.medicalNotes || '');
          setDateOfBirth(p.dateOfBirth ? toDateStr(p.dateOfBirth) : '');
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [elderlyId]);

  const handleSave = async () => {
    if (!elderlyId) return;
    setSaving(true);
    try {
      await updateElderlyProfile(elderlyId, {
        address: address.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
        dateOfBirth: dateOfBirth?.trim() ? dateOfBirth.trim() : null,
      });
      showAlert({
        title: 'Thành công',
        message: 'Đã cập nhật hồ sơ',
        type: 'success',
        onConfirm: () => navigation.goBack(),
      });
    } catch (e) {
      showAlert({
        title: 'Lỗi',
        message: e.response?.data?.message || 'Không thể cập nhật',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Địa chỉ thường trú" multiline numberOfLines={2} />
          <Text style={styles.label}>Liên hệ khẩn cấp</Text>
          <TextInput style={styles.input} value={emergencyContact} onChangeText={setEmergencyContact} placeholder="SĐT hoặc tên người liên hệ khẩn cấp" />
          <Text style={styles.label}>Ngày sinh</Text>
          <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" />
          <Text style={styles.label}>Ghi chú y tế</Text>
          <TextInput style={[styles.input, styles.textArea]} value={medicalNotes} onChangeText={setMedicalNotes} placeholder="Dị ứng, bệnh nền, lưu ý..." multiline numberOfLines={4} />
        </View>
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lưu thay đổi</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#0f766e', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
