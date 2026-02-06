
import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColors = {
    success: 'bg-[#00B050] border-[#00B050]/50 text-white',
    error: 'bg-red-600 border-red-500/50 text-white',
    info: 'bg-[#6C5DD3] border-[#6C5DD3]/50 text-white',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border ${bgColors[toast.type]} backdrop-blur-md animate-slide-in`}>
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
        {icons[toast.type]}
      </div>
      <p className="font-bold text-sm leading-tight">{toast.message}</p>
    </div>
  );
};
