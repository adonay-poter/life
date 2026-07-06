'use client';

import React, { useState, useEffect } from 'react';
import { DashboardProvider } from '@/context/DashboardContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { SoulBlueprintProvider } from '@/context/SoulBlueprintContext';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import PomodoroFloating from '@/components/PomodoroFloating';
import PWARegister from '@/components/pwa-register';
import SkeletonLoader from '@/components/SkeletonLoader';
import PageTransition from '@/components/PageTransition';
import UniversalCaptureModal from '@/components/UniversalCaptureModal';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) setMounted(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );

      if (isTyping) return;

      // Option+C or Alt+C or 'c'
      if ((e.key === 'c' || e.key === 'C') && (e.altKey || e.metaKey || !e.ctrlKey)) {
        // Prevent default if it's Alt+C or Option+C
        if (e.altKey) {
          e.preventDefault();
        }
        setIsCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  if (!mounted) {
    return <SkeletonLoader />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGuard>
          <DashboardProvider>
            <SoulBlueprintProvider>
              <PWARegister />
              <div className="min-h-screen bg-neutral-bg flex flex-col md:flex-row text-primary">
                {/* Navigation */}
                <Sidebar onCaptureTrigger={() => setIsCaptureOpen(true)} />
                <MobileNav onCaptureTrigger={() => setIsCaptureOpen(true)} />

                {/* Main Content Area — PageTransition re-mounts on every route change */}
                <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden px-4 py-6 md:p-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
                  <PageTransition>{children}</PageTransition>
                </main>

                {/* Global Floating Widget */}
                <PomodoroFloating />

              {/* Global Quick Capture Modal */}
              <UniversalCaptureModal isOpen={isCaptureOpen} onClose={() => setIsCaptureOpen(false)} />
              </div>
            </SoulBlueprintProvider>
          </DashboardProvider>
        </AuthGuard>
      </AuthProvider>
    </ToastProvider>
  );
}
