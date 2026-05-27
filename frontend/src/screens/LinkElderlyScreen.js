import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAlert } from '../utils/showAlert';
import { linkByPhone, linkByEmail } from '../api/users';

export default function LinkElderlyScreen({ navigation }) {
  const { showAlert } = useAlert();
  const [mode, setMode] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    const trimmed = mode === 'phone' ? phone?.trim() : email?.trim();
    if (!trimmed) {
      showAlert({
        title: 'Lỗi',
        message: mode === 'phone'
          ? 'Vui lòng nhập số điện thoại người cao tuổi cần liên kết'
          : 'Vui lòng nhập email người cao tuổi cần liên kết',
        type: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'phone') {
        await linkByPhone(trimmed);
      } else {
        await linkByEmail(trimmed);
      }
      showAlert({
        title: 'Thành công',
        message: 'Đã liên kết với người cao tuổi. Bạn có thể theo dõi họ trong danh sách.',
        type: 'success',
        onConfirm: () => navigation.goBack(),
      });
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Liên kết thất bại';
      showAlert({ title: 'Lỗi', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Liên kết người cao tuổi</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'phone' && styles.tabActive]}
            onPress={() => setMode('phone')}
          >
            <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>Số điện thoại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'email' && styles.tabActive]}
            onPress={() => setMode('email')}
          >
            <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {mode === 'phone'
            ? 'Nhập số điện thoại tài khoản người cao tuổi để thêm vào danh sách chăm sóc.'
            : 'Nhập email tài khoản người cao tuổi để thêm vào danh sách chăm sóc.'}
        </Text>
        {mode === 'phone' ? (
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại (vd: 0912345678)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Email (vd: nguoicaotuoi@email.com)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        )}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Liên kết</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Lưu ý</Text>
        <Text style={styles.infoText}>• Người cao tuổi cần đăng ký tài khoản trước</Text>
        <Text style={styles.infoText}>• Chỉ có thể liên kết với tài khoản vai trò "Người cao tuổi"</Text>
        <Text style={styles.infoText}>• SĐT: bỏ qua khoảng trắng, dấu gạch. Email: so khớp chính xác</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f766e',
    marginBottom: 8,
  },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#0f766e' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#0f766e',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#e6f7f5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0f766e',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f766e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
});
