import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../utils/showAlert';
import { getMessages, sendImage, sendText, analyzeMealMessage, WS_URL } from '../api/chat';
import { API_URL } from '../api/client';
import { useSilentPolling } from '../utils/useSilentPolling';

function safeParseFoods(json) {
  try {
    const obj = JSON.parse(json);
    const items = Array.isArray(obj)
      ? obj
      : (obj?.items || obj?.foods || obj?.foodItems || []);
    const names = (Array.isArray(items) ? items : [])
      .map((it) => (typeof it === 'string' ? it : it?.name || it?.food || it?.label))
      .filter(Boolean);
    const note = obj?.note || obj?.summary || obj?.description || null;
    return { names, note };
  } catch {
    // Fallback: backend/LLM may return plain text or fenced JSON; show something instead of nothing.
    const raw = (json || '').trim();
    if (!raw) return null;
    const unfenced = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    return { names: [], note: unfenced };
  }
}

export default function ChatScreen({ route, navigation }) {
  const { conversationId, title } = route.params || {};
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [mealAiUnlocked, setMealAiUnlocked] = useState(() => new Set());
  const [input, setInput] = useState('');
  const flatRef = useRef(null);
  const clientRef = useRef(null);
  const lastSnapshotRef = useRef(null);
  const bottomSyncTimerRef = useRef(null);
  const lastBottomSyncRef = useRef('');

  const isElderly = user?.role === 'ELDERLY';
  const baseFontSize = isElderly ? 19 : 15;
  const baseLineHeight = isElderly ? 30 : 22;
  const aiFontSize = isElderly ? 17 : 12;
  const aiLineHeight = isElderly ? 26 : 18;

  useEffect(() => {
    navigation.setOptions({ title: title || 'Chat' });
  }, [title, navigation]);

  const snapshotKey = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 'empty';
    const last = items[items.length - 1];
    return `${items.length}-${last?.id || ''}-${last?.createdAt || ''}-${last?.text || ''}-${last?.imageUrl || ''}-${last?.aiNote || ''}`;
  };

  const scheduleBottomSync = (delay = 60) => {
    if (bottomSyncTimerRef.current) {
      clearTimeout(bottomSyncTimerRef.current);
      bottomSyncTimerRef.current = null;
    }
    bottomSyncTimerRef.current = setTimeout(() => {
      // Wait until current interactions/layout updates finish to avoid drift.
      InteractionManager.runAfterInteractions(() => {
        flatRef.current?.scrollToEnd({ animated: false });
      });
    }, delay);
  };

  useEffect(() => {
    if (!Array.isArray(list) || list.length === 0) return;
    const last = list[list.length - 1];
    const syncKey = `${list.length}-${last?.id || ''}-${last?.aiFoodItemsJson || ''}-${last?.aiNote || ''}`;
    if (lastBottomSyncRef.current === syncKey) return;
    lastBottomSyncRef.current = syncKey;
    scheduleBottomSync(40);
  }, [list]);

  const load = async ({ silent } = {}) => {
    if (!conversationId) return;
    if (!silent) setLoading(true);
    try {
      const res = await getMessages(conversationId, 50);
      const items = res.data?.data || [];
      const key = snapshotKey(items);
      if (silent && lastSnapshotRef.current === key) return;
      lastSnapshotRef.current = key;
      setList(items);
      setMealAiUnlocked((prev) => {
        const next = new Set(prev);
        for (const m of items) {
          if (m?.id != null && m?.aiFoodItemsJson != null && String(m.aiFoodItemsJson).trim() !== '') {
            next.add(m.id);
          }
        }
        return next;
      });
    } catch (e) {
      if (!silent) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không tải được tin nhắn', type: 'error' });
      }
    } finally {
      if (!silent) {
        setLoading(false);
        scheduleBottomSync(0);
      }
    }
  };

  useEffect(() => {
    setMealAiUnlocked(new Set());
    load();
  }, [conversationId]);

  // fallback polling: if WS drops, messages still update
  useSilentPolling(load, [conversationId], 3000, false);

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !conversationId) return;

        const client = new Client({
          reconnectDelay: 2000,
          webSocketFactory: () =>
            new WebSocket(WS_URL, undefined, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          onConnect: () => {
            if (!active) return;
            client.subscribe(`/topic/conversations/${conversationId}`, (msg) => {
              try {
                const body = JSON.parse(msg.body);
                setList((prev) => {
                  const idx = prev.findIndex((m) => m.id === body.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = body;
                    return next;
                  }
                  return [...prev, body];
                });
                if (body?.id != null && body?.aiFoodItemsJson != null && String(body.aiFoodItemsJson).trim() !== '') {
                  setMealAiUnlocked((prev) => {
                    const next = new Set(prev);
                    next.add(body.id);
                    return next;
                  });
                }
                scheduleBottomSync(20);
              } catch {}
            });
          },
          onStompError: () => {},
        });

        client.activate();
        clientRef.current = client;
      } catch {}
    };

    connect();
    return () => {
      active = false;
      try {
        clientRef.current?.deactivate();
      } catch {}
      clientRef.current = null;
    };
  }, [conversationId]);

  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', () => scheduleBottomSync(50));
    const onHide = Keyboard.addListener('keyboardDidHide', () => scheduleBottomSync(50));
    return () => {
      onShow.remove();
      onHide.remove();
      if (bottomSyncTimerRef.current) {
        clearTimeout(bottomSyncTimerRef.current);
        bottomSyncTimerRef.current = null;
      }
    };
  }, []);

  const canRequestMealAnalysis = (item) => {
    const j = item?.aiFoodItemsJson;
    if (j != null && String(j).trim().length > 0) return false;
    return true;
  };

  const handleAnalyzeMeal = async (item) => {
    if (!conversationId || !item?.id) return;
    setMealAiUnlocked((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setAnalyzingId(item.id);
    try {
      const res = await analyzeMealMessage(conversationId, item.id);
      const dto = res?.data?.data;
      if (dto) upsertMessage(dto);
    } catch (e) {
      const status = e?.response?.status;
      const message = String(e?.response?.data?.message || e?.message || '').toLowerCase();
      const code = String(e?.code || '').toLowerCase();
      const isTransientAnalyzeError =
        // Request timed out on client/proxy while backend may still be analyzing.
        code === 'econnaborted' ||
        message.includes('timeout') ||
        // Network dropped temporarily; polling/ws can still fetch final result.
        message === 'network error' ||
        message.includes('network request failed') ||
        // Abort/cancel should be silent for this action.
        code === 'err_canceled' ||
        message.includes('canceled') ||
        // Retry-safe server states that do not need noisy alert.
        status === 408 || status === 429 || status === 502 || status === 503 || status === 504;

      if (!isTransientAnalyzeError) {
        showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không phân tích được', type: 'error' });
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const base = (API_URL || '').replace(/\/api\/?$/, '');
    return base ? `${base}${url.startsWith('/') ? '' : '/'}${url}` : url;
  };

  const renderFormattedAi = (text) => {
    if (!text) return null;
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    return (
      <View style={styles.aiBlock}>
        {lines.map((raw, idx) => {
          const line = raw.trimEnd();
          if (!line.trim()) return <View key={idx} style={{ height: 6 }} />;

          const isH3 = /^\s*###\s+/.test(line);
          const isH2 = /^\s*##\s+/.test(line);
          const isBullet = /^\s*[-*]\s+/.test(line);

          const clean = line
            .replace(/^\s*###\s+/, '')
            .replace(/^\s*##\s+/, '')
            .replace(/^\s*[-*]\s+/, '• ')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .trim();

          return (
            <Text
              key={idx}
              style={[
                styles.aiNote,
                {
                  fontSize: aiFontSize,
                  lineHeight: aiLineHeight,
                },
                (isH2 || isH3) && styles.aiHeading,
                isH2 && { fontSize: aiFontSize + 2, lineHeight: aiLineHeight + 2 },
                isH3 && { fontSize: aiFontSize + 1, lineHeight: aiLineHeight + 1 },
                isBullet && styles.aiBullet,
              ]}
            >
              {clean}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isMe = user?.id != null && Number(item.senderId) === Number(user.id);
    const imageUri = item.imageUrl ? resolveImageUrl(item.imageUrl) : null;
    const hasAiPayload =
      (item.aiFoodItemsJson != null && String(item.aiFoodItemsJson).trim() !== '') ||
      (item.aiNote != null && String(item.aiNote).trim() !== '');
    const showMealAiOutput = !!imageUri && mealAiUnlocked.has(item.id) && hasAiPayload;

    let foodLine = null;
    let noteLine = null;
    if (showMealAiOutput) {
      const parsed = item.aiFoodItemsJson ? safeParseFoods(item.aiFoodItemsJson) : null;
      foodLine = parsed?.names?.length ? `Món ăn: ${parsed.names.join(', ')}` : null;
      noteLine = parsed?.note || item.aiNote;
    }

    const showMealAiBtn = isMe && imageUri && canRequestMealAnalysis(item);

    return (
      <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {imageUri ? (
            <View style={styles.imageRow}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                onError={(e) => console.warn('Chat image load failed', imageUri, e?.nativeEvent?.error)}
              />
              {showMealAiBtn ? (
                <TouchableOpacity
                  style={[styles.aiAnalyzeBtn, isMe && styles.aiAnalyzeBtnMe]}
                  onPress={() => handleAnalyzeMeal(item)}
                  disabled={sending || analyzingId === item.id}
                >
                  {analyzingId === item.id ? (
                    <ActivityIndicator color="#0f766e" size="small" />
                  ) : (
                    <Text style={styles.aiAnalyzeBtnText}>AI phân tích</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {item.text ? (
            <Text style={[styles.text, { fontSize: baseFontSize, lineHeight: baseLineHeight }, isMe ? styles.textMe : styles.textOther]}>
              {item.text}
            </Text>
          ) : null}
          {foodLine ? (
            <Text style={[styles.ai, { fontSize: aiFontSize + 1, lineHeight: aiLineHeight }]}>
              {foodLine}
            </Text>
          ) : null}
          {noteLine ? renderFormattedAi(noteLine) : null}
          {item.createdAt ? (
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const upsertMessage = (msg) => {
    if (!msg?.id) return;
    setList((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next;
      }
      return [...prev, msg];
    });
    scheduleBottomSync(10);
  };

  const canSend = input.trim().length > 0 && !sending;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId) return;
    setSending(true);
    setInput('');
    try {
      const res = await sendText(conversationId, text);
      const dto = res?.data?.data;
      if (dto) upsertMessage(dto);
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không gửi được', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    if (!conversationId || sending) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Thiếu quyền', message: 'Cần quyền camera để chụp ảnh bữa ăn.', type: 'error' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fd = new FormData();
      fd.append('image', {
        uri: asset.uri,
        name: 'meal.jpg',
        type: 'image/jpeg',
      });
      if (input.trim()) fd.append('text', input.trim());

      setSending(true);
      setInput('');
      const res = await sendImage(conversationId, fd);
      const dto = res?.data?.data;
      if (dto) upsertMessage(dto);
    } catch (e) {
      showAlert({ title: 'Lỗi', message: e.response?.data?.message || 'Không gửi được ảnh', type: 'error' });
    } finally {
      setSending(false);
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
      <FlatList
        ref={flatRef}
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scheduleBottomSync(80)}
        keyboardShouldPersistTaps="handled"
      />
      <View style={styles.inputRow}>
        <TouchableOpacity style={[styles.camBtn, sending && styles.btnDisabled]} onPress={pickImage} disabled={sending}>
          <Text style={styles.camText}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { fontSize: baseFontSize, lineHeight: baseLineHeight }]}
          value={input}
          onChangeText={setInput}
          placeholder="Nhắn tin..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity style={[styles.sendBtn, (!canSend) && styles.btnDisabled]} onPress={handleSend} disabled={!canSend}>
          <Text style={styles.sendText}>{sending ? '...' : 'Gửi'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 12, paddingBottom: 8 },
  row: { marginBottom: 10, flexDirection: 'row' },
  rowMe: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10 },
  bubbleMe: { backgroundColor: '#0f766e', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  text: { fontSize: 15, lineHeight: 22 },
  textMe: { color: '#fff' },
  textOther: { color: '#1f2937' },
  time: { fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'right' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  image: { width: 220, height: 220, borderRadius: 12, backgroundColor: '#e5e7eb' },
  aiAnalyzeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAnalyzeBtnMe: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  aiAnalyzeBtnText: { color: '#0f766e', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  ai: { marginTop: 8, color: '#111827', fontWeight: '800' },
  aiBlock: { marginTop: 6 },
  aiHeading: { fontWeight: '800', color: '#111827', marginTop: 6 },
  aiBullet: { paddingLeft: 8 },
  aiNote: { marginTop: 2, color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  camBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  camText: { fontSize: 18 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120, backgroundColor: '#f9fafb' },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0f766e', borderRadius: 18, minHeight: 44, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});

