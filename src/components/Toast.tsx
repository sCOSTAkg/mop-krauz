import React, { useEffect, useState, useRef, useCallback } from 'react';

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
  const [isExiting, setIsExiting] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove, isExiting]);

  // Auto-dismiss 5s
  useEffect(() => {
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  // Swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    setSwipeX(e.touches[0].clientX - startXRef.current);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    if (Math.abs(swipeX) > 80) {
      setSwipeX(swipeX > 0 ? 400 : -400);
      setTimeout(() => onRemove(toast.id), 200);
    } else {
      setSwipeX(0);
    }
  };

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    dismiss();
  };

  const handleClick = () => {
    if (toast.link && onClick) {
      onClick();
      dismiss();
    }
  };

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

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
        opacity: Math.abs(swipeX) > 80 ? 0.5 : 1,
        transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
      }}
      className={`pointer-events-auto flex items-center gap-3 p-3.5 pr-2.5 rounded-xl shadow-md border ${bgColors[toast.type]} backdrop-blur-md ${isExiting ? 'animate-toast-out' : 'animate-toast-in'} ${toast.link ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{toast.message}</p>
        {toast.link && <span className="text-xs opacity-70 underline mt-0.5 block">Нажмите, чтобы перейти</span>}
      </div>
      <button
        onClick={handleClose}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 active:bg-white/40 flex-shrink-0 ml-1"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-white text-xs font-bold leading-none">✕</span>
      </button>
    </div>
  );
};
