'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAuth } from '@/context/AuthContext';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  CheckSquare,
  GraduationCap,
  Activity,
  BookOpen,
  Cloud,
  CloudOff,
  Menu,
  X,
  LogOut,
  Plus
} from 'lucide-react';

function useModalActive() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const checkModal = () => {
      const modal = document.querySelector('.bg-black\\/40, .bg-black\\/45, .bg-black\\/50');
      setActive(!!modal);
    };

    checkModal();

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('click', checkModal);
    window.addEventListener('touchend', checkModal);

    return () => {
      observer.disconnect();
      window.removeEventListener('click', checkModal);
      window.removeEventListener('touchend', checkModal);
    };
  }, []);

  return active;
}

export default function MobileNav({ onCaptureTrigger }: { onCaptureTrigger: () => void }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { isOnline, tasks, habits, habitRecords, lessons } = useDashboard();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isTasksPage = pathname === '/tasks';
  const isModalActive = useModalActive();

  const handleFabClick = () => {
    if (isTasksPage) {
      window.dispatchEvent(new Event('trigger_add_task'));
    } else {
      onCaptureTrigger();
    }
  };

  // 1. Tasks Completion (Weighted)
  const getWeightedTaskProgress = () => {
    if (tasks.length === 0) return 100;
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let completedWeight = 0;
    tasks.forEach((t) => {
      const weight = priorityWeights[t.priority] || 1;
      totalWeight += weight;
      if (t.status === 'done') completedWeight += weight;
    });
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  // 2. Habit Consistency (Last 7 days)
  const getHabitProgress = () => {
    if (habits.length === 0) return 100;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return getLocalDateString(d);
    });
    const totalPossible = habits.length * 7;
    let completedCount = 0;
    habits.forEach((h) => {
      last7Days.forEach((date) => {
        const record = habitRecords.find((r) => r.habit_id === h.id && r.date === date);
        if (record) {
          if (h.type === 'binary' && record.value > 0) completedCount += 1;
          else if (h.type === 'numeric' && record.value >= h.goal) completedCount += 1;
        }
      });
    });
    return Math.round((completedCount / totalPossible) * 100);
  };

  // 3. Learning Progress
  const getLearningProgress = () => {
    if (lessons.length === 0) return 100;
    const completed = lessons.filter((l) => l.completed).length;
    return Math.round((completed / lessons.length) * 100);
  };

  const lifeScore = Math.round(
    getWeightedTaskProgress() * 0.4 +
    getHabitProgress() * 0.3 +
    getLearningProgress() * 0.3
  );

  const coreMenuItems = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Habits', href: '/habits', icon: Activity }
  ];

  return (
    <div className="md:hidden flex flex-col shrink-0">
      {/* Top Mobile Header */}
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-baseline space-x-2">
          <span className="font-amharic font-bold text-xl text-primary tracking-tight">ሁሉ</span>
          <span className="font-label text-xs text-secondary uppercase tracking-[0.15em]">OS</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile Cloud Indicator */}
          {isOnline ? (
            <Cloud className="h-4 w-4 text-success" />
          ) : (
            <CloudOff className="h-4 w-4 text-accent" />
          )}

          {/* Micro Life Score Badge */}
          <div className="bg-primary text-on-primary px-2 py-0.5 rounded-none font-label text-xs font-semibold tracking-wider">
            {lifeScore}%
          </div>

          <ThemeToggle />
          <NotificationCenter />
        </div>
      </header>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around items-center py-2 px-1 z-40 pb-safe shadow-none">
        {coreMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`mobile-tab flex flex-col items-center justify-center w-12 py-1 rounded-none ${
                isActive ? 'text-accent font-bold' : 'text-secondary'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-label text-[10px] mt-0.5 uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`mobile-tab flex flex-col items-center justify-center w-12 py-1 rounded-none cursor-pointer ${
            isDrawerOpen ? 'text-accent font-bold' : 'text-secondary'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="font-label text-[10px] mt-0.5 uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* Bottom Drawer Overlay */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[9990] md:hidden animate-backdrop"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Card */}
          <div className="fixed bottom-14 left-0 right-0 bg-surface border-t-2 border-primary p-5 shadow-none z-[9999] md:hidden rounded-none animate-drawer">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4 font-label">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] font-semibold">
                More Sectors
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-secondary hover:text-primary p-1 cursor-pointer btn-press"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Projects', href: '/projects', icon: FolderKanban, desc: 'Sectors' },
                { name: 'Academy', href: '/academy', icon: GraduationCap, desc: 'Academy' },
                { name: 'Journal', href: '/journal', icon: BookOpen, desc: 'Journal' },
              ].map((item, i) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`btn-press flex flex-col items-center justify-center p-3 border rounded-none text-center ${
                      isActive
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-neutral-bg/45 border-border hover:border-primary'
                    }`}
                    style={{ '--stagger-i': i } as React.CSSProperties}
                  >
                    <Icon className="h-6 w-6 mb-1.5 shrink-0" />
                    <span className="font-label text-xs uppercase font-bold tracking-wide">
                      {item.name}
                    </span>
                    <span className="font-sans text-[10px] text-secondary mt-0.5 lowercase">
                      {item.desc}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Log Out Button */}
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                signOut();
              }}
              className="w-full mt-4 py-3 border border-accent/40 hover:border-accent text-accent bg-neutral-bg/30 hover:bg-accent/5 font-label text-xs uppercase tracking-wider font-semibold rounded-none cursor-pointer flex items-center justify-center space-x-2 btn-press"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </>
      )}
      {/* Mobile Floating Action Button (FAB) for Quick Capture or Create Task */}
      {!isModalActive && (
        <button
          onClick={handleFabClick}
          className="fixed bottom-20 right-6 bg-accent text-on-accent border border-accent/20 p-3.5 shadow-lg z-40 cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-90 active:rotate-90 hover:opacity-90 rounded-none btn-press hover:shadow-xl"
          title={isTasksPage ? "Create New Task" : "Quick Capture"}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
