import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AlertModal({
  visible,
  title,
  message,
  type = 'info', // 'info' | 'success' | 'error' | 'warning' | 'confirm'
  confirmText = 'OK',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  showCancel = false,
}) {
  const colors = {
    info: { bg: '#e0f2fe', accent: '#0284c7', icon: 'i' },
    success: { bg: '#dcfce7', accent: '#16a34a', icon: '✓' },
    error: { bg: '#fee2e2', accent: '#dc2626', icon: '✕' },
    warning: { bg: '#fef3c7', accent: '#d97706', icon: '!' },
    confirm: { bg: '#fef2f2', accent: '#dc2626', icon: '?' },
  };
  const c = colors[type] || colors.info;

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderTopColor: c.accent }]}>
          <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
            <Text style={[styles.icon, { color: c.accent }]}>{c.icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnConfirm, { backgroundColor: c.accent }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.btnConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: Math.min(width - 48, 340),
    alignItems: 'center',
    borderTopWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#f3f4f6',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  btnConfirm: {
  },
  btnConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
