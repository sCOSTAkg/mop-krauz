import React, { useState, createContext, useContext, ReactNode } from 'react';
import Toast, { ToastData, ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within MainLayout');
  }
  return context;
};

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const MAX_TOASTS = 3;

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastData = { id, message, type, duration };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Лимит на 3 тоста
      return updated.slice(-MAX_TOASTS);
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-3"
          style={{ pointerEvents: 'none' }}
        >
          {toasts.map((toast) => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
              <Toast toast={toast} onClose={removeToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default MainLayout;
