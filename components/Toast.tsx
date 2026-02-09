
import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  link?: string;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  onClick?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onRemove, onClick }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColors = {
    success: 'bg-[#34C759] border-[#34C759]/30 text-white',
    error: 'bg-[#FF3B30] border-[#FF3B30]/30 text-white',
    info: 'bg-[#6C5DD3] border-[#6C5DD3]/30 text-white',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const handleClick = () => {
      if (onClick && toast.link) {
          onClick();
          onRemove(toast.id);
      }
  };

  return (
    <div 
        onClick={handleClick}
        className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-md border ${bgColors[toast.type]} backdrop-blur-md animate-slide-in ${toast.link ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
        {icons[toast.type]}
      </div>
      <div className="flex-1">
          <p className="font-semibold text-sm leading-tight">{toast.message}</p>
          {toast.link && <span className="text-xs opacity-70 underline mt-1 block">Нажмите, чтобы перейти</span>}
      </div>
    </div>
  );
};
