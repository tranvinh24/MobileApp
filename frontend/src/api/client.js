import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Thiết bị thật (iOS/Android WiFi): IP máy PC | Emulator: iOS=localhost, Android=10.0.2.2 | Web: localhost
const CONFIG_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants?.expoConfig?.extra?.apiUrl ||
  Constants?.expoConfig?.extra?.API_URL ||
  '';

const API_URL = (CONFIG_API_URL && CONFIG_API_URL.startsWith('http'))
  ? CONFIG_API_URL.replace(/\/+$/, '')
  : Platform.OS === 'web'
    ? 'http://localhost:8082/api'
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:8082/api' // Android emulator (nếu chạy trên thiết bị thật, set EXPO_PUBLIC_API_URL)
      : 'http://172.20.10.4:8082/api'; // iOS sim / fallback

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If sending multipart/form-data (FormData), do NOT force application/json.
    // Let axios/react-native set the correct Content-Type with boundary.
    const data = config.data;
    const isFormData =
      (typeof FormData !== 'undefined' && data instanceof FormData) ||
      (data && typeof data === 'object' && Array.isArray(data._parts)); // RN FormData shape
    if (isFormData) {
      try {
        if (config.headers && 'Content-Type' in config.headers) {
          delete config.headers['Content-Type'];
        }
        if (config.headers && 'content-type' in config.headers) {
          delete config.headers['content-type'];
        }
      } catch (_) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
