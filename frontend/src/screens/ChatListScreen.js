import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getConversations } from '../api/chat';
import { useSilentPolling } from '../utils/useSilentPolling';

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async ({ silent } = {}) => {
    try {
      const res = await getConversations();
      setList(res.data?.data || []);
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được danh sách chat', type: 'error' });
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

  const open = (c) => {
    const otherName = user?.role === 'ELDERLY' ? c.caregiverName : c.elderlyName;
    navigation.navigate('Chat', { conversationId: c.id, title: otherName || 'Chat' });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {list.map((c) => {
        const otherName = user?.role === 'ELDERLY' ? c.caregiverName : c.elderlyName;
        return (
          <TouchableOpacity key={c.id} style={styles.row} onPress={() => open(c)}>
            <Text style={styles.name} numberOfLines={1}>{otherName || '—'}</Text>
            {!!c.lastMessageText && (
              <Text style={styles.preview} numberOfLines={2}>{c.lastMessageText}</Text>
            )}
            {!!c.lastMessageAt && (
              <Text style={styles.time}>{new Date(c.lastMessageAt).toLocaleString('vi-VN')}</Text>
            )}
          </TouchableOpacity>
        );
      })}
      {list.length === 0 && (
        <Text style={styles.empty}>Chưa có cuộc trò chuyện. Hãy liên kết người giám hộ/người cao tuổi trước.</Text>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#0f766e' },
  preview: { fontSize: 13, color: '#374151', marginTop: 6 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 24 },
});

