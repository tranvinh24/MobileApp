import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { searchNearbyPharmacies, searchNearbyHospitals } from '../services/pharmacySearch';

const BOT_AVATAR = '🤖';
const USER_AVATAR = '👤';

function isPharmacyIntent(text) {
  const t = (text || '').toLowerCase().trim();
  return (
    t.includes('nhà thuốc') ||
    t.includes('nha thuoc') ||
    t.includes('pharmacy') ||
    t.includes('quầy thuốc') ||
    t.includes('quay thuoc') ||
    t.includes('bệnh viện') ||
    t.includes('benh vien') ||
    t.includes('hospital') ||
    t.includes('phòng khám') ||
    t.includes('phong kham') ||
    t.includes('gần nhất') ||
    t.includes('gan nhat') ||
    t.includes('gần đây') ||
    t.includes('gan day') ||
    t.includes('tìm thuốc') ||
    t.includes('tim thuoc') ||
    t === 'hi' ||
    t === 'chào' ||
    t === 'hello' ||
    t === 'xin chào'
  );
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Xin chào! Tôi có thể giúp bạn tìm nhà thuốc hoặc bệnh viện gần nhất. Hãy nhắn "nhà thuốc gần nhất" hoặc "bệnh viện gần nhất" để bắt đầu.',
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text, time: new Date() },
    ]);
    setLoading(true);
    try {
      if (isPharmacyIntent(text)) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'bot',
              text: 'Cần quyền truy cập vị trí để tìm nhà thuốc gần bạn. Vui lòng bật quyền vị trí trong Cài đặt.',
              time: new Date(),
            },
          ]);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const wantHospital = /bệnh viện|benh vien|hospital|phòng khám|phong kham/i.test(text);
        let reply = '';
        let hospitals = [];
        let pharmacies = [];

        if (wantHospital) {
          reply = 'Đang tìm bệnh viện/phòng khám gần bạn...\n\n';
          hospitals = await searchNearbyHospitals(lat, lng, 10000, 8);
          if (hospitals.length === 0) {
            reply += 'Không tìm thấy bệnh viện. Đang tìm nhà thuốc...\n\n';
            pharmacies = await searchNearbyPharmacies(lat, lng, 5000, 8);
          }
        } else {
          reply = 'Đang tìm nhà thuốc gần bạn...\n\n';
          pharmacies = await searchNearbyPharmacies(lat, lng, 5000, 8);
          if (pharmacies.length === 0) {
            reply += 'Không tìm thấy nhà thuốc. Đang tìm bệnh viện/phòng khám...\n\n';
            hospitals = await searchNearbyHospitals(lat, lng, 10000, 8);
          }
        }

        const items = pharmacies.length > 0 ? pharmacies : hospitals;
        const typeLabel = pharmacies.length > 0 ? 'nhà thuốc' : 'bệnh viện/phòng khám';
        if (items.length > 0) {
          reply = `Tìm thấy ${items.length} ${typeLabel} gần bạn:`;
          if (pharmacies.length === 0) {
            reply += '\n\n💡 Gợi ý: Bạn có thể đến bệnh viện/phòng khám để mua thuốc hoặc khám bệnh.';
          }
        } else {
          reply += 'Không tìm thấy nhà thuốc và bệnh viện trong vùng lân cận.\n\n';
          reply += '📋 Lời khuyên:\n';
          reply += '• Gọi 115 (cấp cứu) hoặc 1900 3228 (tư vấn sức khỏe Bộ Y tế) để được hướng dẫn.\n';
          reply += '• Hỏi người dân địa phương về nhà thuốc hoặc trạm y tế gần nhất.\n';
          reply += '• Nếu có đơn thuốc cũ, liên hệ bác sĩ để tư vấn mua thuốc online và giao tận nơi.\n';
          reply += '• Sử dụng nút SOS trong app để thông báo cho người giám hộ khi cần hỗ trợ.';
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'bot',
            text: reply,
            data: items.length > 0 ? { items, typeLabel } : null,
            time: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'bot',
            text: 'Tôi có thể giúp bạn tìm nhà thuốc hoặc bệnh viện gần nhất. Hãy nhắn "nhà thuốc gần nhất" hoặc "bệnh viện gần nhất".',
            time: new Date(),
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'bot',
          text: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
          time: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    const hasResults = item.data?.items?.length > 0;
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        <Text style={styles.msgAvatar}>{isUser ? USER_AVATAR : BOT_AVATAR}</Text>
        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleBot]}>
          {item.text ? (
            <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
              {item.text}
            </Text>
          ) : null}
          {hasResults && item.data.items.map((p, i) => (
            <View key={i} style={styles.resultItem}>
              <Text style={styles.resultName}>{i + 1}. {p.name}</Text>
              <Text style={styles.resultAddr}>📍 {p.address}</Text>
              {p.phone && <Text style={styles.resultPhone}>📞 {p.phone}</Text>}
              <Text style={styles.resultDist}>📏 Khoảng {p.distance.toFixed(1)} km</Text>
              {p.mapsUrl && (
                <TouchableOpacity
                  style={styles.mapsBtn}
                  onPress={() => Linking.openURL(p.mapsUrl)}
                >
                  <Text style={styles.mapsBtnText}>🗺️ Mở bản đồ</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingRow}>
              <Text style={styles.msgAvatar}>{BOT_AVATAR}</Text>
              <View style={[styles.msgBubble, styles.msgBubbleBot]}>
                <ActivityIndicator size="small" color="#0f766e" />
              </View>
            </View>
          ) : null
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhắn để tìm nhà thuốc gần nhất..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgRowBot: {},
  msgAvatar: { fontSize: 24, marginHorizontal: 8 },
  msgBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  msgBubbleUser: {
    backgroundColor: '#0f766e',
    borderBottomRightRadius: 4,
  },
  msgBubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#fff' },
  msgTextBot: { color: '#1f2937' },
  resultItem: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  resultAddr: { fontSize: 13, color: '#4b5563', marginBottom: 2 },
  resultPhone: { fontSize: 13, color: '#0f766e', marginBottom: 2 },
  resultDist: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  mapsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapsBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  loadingRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 44,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
