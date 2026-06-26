'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, action }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-[#2E7D32] bg-[#EAF5EC] text-[#2E7D32]';
      case 'error':
        return 'border-[#B8422E] bg-[#FFEBEE] text-[#B8422E]';
      case 'warning':
        return 'border-[#D1A153] bg-[#FFFDE7] text-[#D1A153]';
      case 'info':
      default:
        return 'border-[#6C7278] bg-[#F7F5F2] text-[#1A1C1E]';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-3 w-[90%] max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between border p-4 shadow-xl transition-all duration-300 animate-slide-up rounded-sm font-label text-xs uppercase tracking-wider ${getToastStyles(
              toast.type
            )}`}
          >
            <div className="flex-1 mr-4">
              <span>{toast.message}</span>
              {toast.action && (
                <span className="ml-2.5">
                  {toast.action.href ? (
                    <Link
                      href={toast.action.href}
                      onClick={() => {
                        if (toast.action?.onClick) toast.action.onClick();
                        removeToast(toast.id);
                      }}
                      className="font-bold underline text-[#B8422E] hover:opacity-85 transition-opacity"
                    >
                      {toast.action.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (toast.action?.onClick) toast.action.onClick();
                        removeToast(toast.id);
                      }}
                      className="font-bold underline text-[#B8422E] hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#6C7278] hover:text-[#1A1C1E] transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
