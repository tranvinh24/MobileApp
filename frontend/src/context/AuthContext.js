import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import api from '../api/client';
import { registerDevice } from '../api/devices';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        const res = await api.get('/users/me');
        if (res.data?.data) {
          const u = res.data.data;
          setUser(u);
          await AsyncStorage.setItem('user', JSON.stringify(u));
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const registerPushTokenIfPossible = async () => {
    try {
      if (Platform.OS === 'web') return;
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const perm = await Notifications.getPermissionsAsync();
      let status = perm.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') return;

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        Constants?.expoConfig?.owner; // fallback, không chắc chắn
      const expoToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      if (!expoToken) return;

      const deviceInfo = `${Platform.OS} ${Platform.Version || ''}`.trim();
      await registerDevice({ token: expoToken, platform: Platform.OS, deviceInfo });
    } catch (_) {}
  };

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const wrap = res.data || res;
    const data = wrap.data || wrap;
    if (!data.token) throw new Error(wrap.message || data.message || 'Đăng nhập thất bại');
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify({
      id: data.userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
    }));
    setUser({ id: data.userId, email: data.email, fullName: data.fullName, role: data.role });
    await registerPushTokenIfPossible();
  };

  const register = async (data) => {
    const res = await apiRegister(data);
    const wrap = res.data || res;
    const d = wrap.data || wrap;
    if (!d.token) throw new Error(wrap.message || d.message || 'Đăng ký thất bại');
    await AsyncStorage.setItem('token', d.token);
    await AsyncStorage.setItem('user', JSON.stringify({
      id: d.userId,
      email: d.email,
      fullName: d.fullName,
      role: d.role,
    }));
    setUser({ id: d.userId, email: d.email, fullName: d.fullName, role: d.role });
    await registerPushTokenIfPossible();
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
