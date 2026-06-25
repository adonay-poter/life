'use client';

import React, { useState, useEffect } from 'react';
import { DashboardProvider } from '@/context/DashboardContext';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import PomodoroFloating from '@/components/PomodoroFloating';
import PWARegister from '@/components/pwa-register';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) setMounted(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mounted) {
    return <SkeletonLoader />;
  }

  return (
    <DashboardProvider>
      <PWARegister />
      <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row text-[#1A1C1E]">
        {/* Navigation */}
        <Sidebar />
        <MobileNav />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden px-4 py-6 md:p-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Global Floating Widget */}
        <PomodoroFloating />
      </div>
    </DashboardProvider>
  );
}
