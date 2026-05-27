'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColor = toast.type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const icon = toast.type === 'success' ? '✓' : '✕';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4`}>
      <span className="font-bold text-lg">{icon}</span>
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}
