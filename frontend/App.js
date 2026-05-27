import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AlertProvider } from './src/utils/showAlert';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ElderlyHomeScreen from './src/screens/ElderlyHomeScreen';
import CaregiverHomeScreen from './src/screens/CaregiverHomeScreen';
import PrescriptionsScreen from './src/screens/PrescriptionsScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import PrescriptionDetailScreen from './src/screens/PrescriptionDetailScreen';
import EditPrescriptionScreen from './src/screens/EditPrescriptionScreen';
import LinkElderlyScreen from './src/screens/LinkElderlyScreen';
import ElderlyDetailScreen from './src/screens/ElderlyDetailScreen';
import EditElderlyProfileScreen from './src/screens/EditElderlyProfileScreen';
import AddPrescriptionScreen from './src/screens/AddPrescriptionScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import AccountScreen from './src/screens/AccountScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import HealthTimelineScreen from './src/screens/HealthTimelineScreen';
import HealthEntryFormScreen from './src/screens/HealthEntryFormScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminConfigScreen from './src/screens/AdminConfigScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f766e' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="Home" component={AdminHomeScreen} options={{ title: 'ElderCare Admin' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Quản lý người dùng' }} />
      <Stack.Screen name="AdminConfig" component={AdminConfigScreen} options={{ title: 'Cấu hình hệ thống' }} />
    </Stack.Navigator>
  );
}

function MainStack() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isElderly = user?.role === 'ELDERLY';
  const isCaregiver = user?.role === 'CAREGIVER';

  if (isAdmin) return <AdminStack />;

  const HomeScreen = isElderly ? ElderlyHomeScreen : isCaregiver ? CaregiverHomeScreen : PlaceholderScreen;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f766e' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ElderCare' }} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: 'Đơn thuốc' }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Cảnh báo' }} />
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} options={{ title: 'Chi tiết đơn thuốc' }} />
      <Stack.Screen name="EditPrescription" component={EditPrescriptionScreen} options={{ title: 'Sửa đơn thuốc' }} />
      <Stack.Screen name="LinkElderly" component={LinkElderlyScreen} options={{ title: 'Liên kết người cao tuổi' }} />
      <Stack.Screen name="ElderlyDetail" component={ElderlyDetailScreen} options={({ route }) => ({ title: route.params?.elderlyName || 'Chi tiết' })} />
      <Stack.Screen name="EditElderlyProfile" component={EditElderlyProfileScreen} options={{ title: 'Chỉnh sửa hồ sơ' }} />
      <Stack.Screen name="AddPrescription" component={AddPrescriptionScreen} options={{ title: 'Thêm đơn thuốc' }} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Chatbot - Tìm nhà thuốc' }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Tin nhắn' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="HealthTimeline" component={HealthTimelineScreen} options={{ title: 'Hồ sơ sức khoẻ' }} />
      <Stack.Screen name="HealthEntryForm" component={HealthEntryFormScreen} options={{ title: 'Chỉ số sức khoẻ' }} />
      <Stack.Screen name="Devices" component={DevicesScreen} options={{ title: 'Thiết bị đăng nhập' }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Thông tin tài khoản' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AlertProvider>
    </AuthProvider>
  );
}
