'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SystemContextProps {
  isOnline: boolean;
  syncPending: boolean;
  setSyncPending: (pending: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const SystemContext = createContext<SystemContextProps | undefined>(undefined);

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <SystemContext.Provider value={{ isOnline, syncPending, setSyncPending, refreshKey, triggerRefresh }}>
      {children}
    </SystemContext.Provider>
  );
};
