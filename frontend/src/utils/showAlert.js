import { createContext, useContext, useState } from 'react';
import AlertModal from '../components/AlertModal';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  const showAlert = (options) => {
    return new Promise((resolve) => {
      setAlert({
        ...options,
        onConfirm: () => {
          options.onConfirm?.();
          setAlert(null);
          resolve(true);
        },
        onCancel: () => {
          options.onCancel?.();
          setAlert(null);
          resolve(false);
        },
      });
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <AlertModal
          visible={!!alert}
          title={alert.title}
          message={alert.message}
          type={alert.type || 'info'}
          confirmText={alert.confirmText || 'OK'}
          cancelText={alert.cancelText || 'Hủy'}
          showCancel={alert.showCancel}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
};
