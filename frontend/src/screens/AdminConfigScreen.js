import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../utils/showAlert';
import { getAdminConfig, setAdminConfig } from '../api/admin';
import { useSilentPolling } from '../utils/useSilentPolling';

const FRIENDLY_CONFIG = {
  checkin_inactive_minutes: 'Thời gian không điểm danh trước khi cảnh báo (phút)',
  passive_checkin_interval_minutes: 'Chu kỳ điểm danh thụ động (phút)',
  passive_checkin_timeout_minutes: 'Timeout cho 1 lần điểm danh thụ động (phút)',
  max_caregivers_per_elderly: 'Số người giám hộ tối đa cho một người cao tuổi',
  alert_escalation_missed_checkins: 'Số lần bỏ lỡ trước khi nâng mức cảnh báo',
  night_quiet_hours: 'Khung giờ yên lặng ban đêm (ví dụ 22:00-06:00)',
  max_devices_per_user: 'Số thiết bị đăng nhập tối đa / tài khoản',
  med_reminder_enabled: 'Bật nhắc uống thuốc (true/false)',
  med_reminder_default_minutes_before: 'Nhắc uống thuốc mặc định trước (phút)',
  med_auto_mark_missed_minutes: 'Tự đánh dấu MISSED sau (phút)',
  daily_checkin_alert_enabled: 'Bật cảnh báo không điểm danh hằng ngày (true/false)',
  daily_checkin_deadline_time: 'Hạn cuối điểm danh trong ngày (HH:mm)',
  daily_checkin_grace_minutes: 'Ân hạn sau hạn cuối (phút)',
  ai_provider: 'AI provider (vd: google | openai)',
  ai_api_key: 'OpenAI API key (cẩn thận khi lưu)',
  ai_openai_model: 'OpenAI model (vd: gpt-4o-mini)',
  ai_google_api_key: 'Google AI Studio (Gemini) API key',
  ai_google_model: 'Gemini model (vd: gemini-1.5-flash)',
  ai_food_prompt_template: 'AI prompt phân tích ảnh bữa ăn',
  chat_max_image_mb: 'Giới hạn ảnh chat (MB)',
};

export default function AdminConfigScreen({ navigation }) {
  const { showAlert } = useAlert();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async ({ silent } = {}) => {
    try {
      const res = await getAdminConfig();
      setList(res.data?.data || []);
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải cấu hình', type: 'error' });
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  // do not poll while editing modal to avoid overwriting form fields
  useSilentPolling(
    async (opts) => {
      if (modalVisible) return;
      return load(opts);
    },
    [modalVisible],
    3000,
    false
  );

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

  const openEdit = (item) => {
    setEditingKey(item?.configKey || '');
    setEditValue(item?.configValue || '');
    setEditDesc(item?.description || '');
    setModalVisible(true);
  };

  const openNew = () => {
    setEditingKey('');
    setEditValue('');
    setEditDesc('');
    setModalVisible(true);
  };

  const save = async () => {
    const key = (editingKey || '').trim();
    if (!key) {
      showAlert({ title: 'Lỗi', message: 'Nhập key', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await setAdminConfig({ configKey: key, configValue: editValue, description: editDesc || null });
      setModalVisible(false);
      await load();
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không lưu được', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getDisplayKey = (key) => FRIENDLY_CONFIG[key] || key;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Thêm cấu hình</Text>
        </TouchableOpacity>

        {list.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.configRow}
            onPress={() => openEdit(item)}
          >
            <Text style={styles.configKey}>{getDisplayKey(item.configKey)}</Text>
            <Text style={styles.configValue} numberOfLines={2}>{item.configValue || '(trống)'}</Text>
            {item.description ? (
              <Text style={styles.configDesc}>{item.description}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
        {list.length === 0 && (
          <Text style={styles.empty}>Chưa có cấu hình. Bấm "Thêm cấu hình" để tạo.</Text>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingKey ? 'Sửa cấu hình' : 'Thêm cấu hình'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Key (vd: app_name)"
              value={editingKey}
              onChangeText={setEditingKey}
              editable={!editingKey}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Value"
              value={editValue}
              onChangeText={setEditValue}
              multiline
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Mô tả (tùy chọn)"
              value={editDesc}
              onChangeText={setEditDesc}
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#0f766e',
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  configRow: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  configKey: { fontSize: 16, fontWeight: '600', color: '#0f766e' },
  configValue: { fontSize: 14, color: '#374151', marginTop: 4 },
  configDesc: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', padding: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: '#666', fontSize: 16 },
  saveBtn: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
