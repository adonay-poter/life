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
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Sparkles,
  History as ReviewIcon,
  ScrollText
} from 'lucide-react';

export default function Sidebar({ onCaptureTrigger }: { onCaptureTrigger: () => void }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const {
    isOnline,
    syncPending,
    tasks,
    habits,
    habitRecords,
    lessons
  } = useDashboard();

  // Collapsed Sidebar States
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load collapse state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
    setIsLoaded(true);
  }, []);

  // Persist collapse state to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed, isLoaded]);

  // Window Resize Listener to auto-collapse on tablet viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1200) {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==========================================
  // METRIC CALCULATIONS
  // ==========================================

  // 1. Tasks Completion (Weighted)
  const getWeightedTaskProgress = () => {
    if (tasks.length === 0) return 100;
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    tasks.forEach((t) => {
      const weight = priorityWeights[t.priority] || 1;
      totalWeight += weight;
      if (t.status === 'done') {
        completedWeight += weight;
      }
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
          if (h.type === 'binary' && record.value > 0) {
            completedCount += 1;
          } else if (h.type === 'numeric' && record.value >= h.goal) {
            completedCount += 1;
          }
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

  // Calculate Life Score (40% Tasks, 30% Habits, 30% Learning)
  const taskPct = getWeightedTaskProgress();
  const habitPct = getHabitProgress();
  const learningPct = getLearningProgress();
  const lifeScore = Math.round(taskPct * 0.4 + habitPct * 0.3 + learningPct * 0.3);

  const navigationGroups = [
    {
      groupName: 'Command',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Intelligence Feed', href: '/intelligence', icon: Sparkles },
        { name: 'Review Room', href: '/review', icon: ReviewIcon },
        { name: 'Oracle', href: '/oracle', icon: ScrollText }
      ]
    },
    {
      groupName: 'Capture',
      items: [{ name: 'Inbox Triage', href: '/inbox', icon: Inbox }]
    },
    {
      groupName: 'Execute',
      items: [
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare }
      ]
    },
    {
      groupName: 'Learn',
      items: [{ name: 'The Academy', href: '/academy', icon: GraduationCap }]
    },
    {
      groupName: 'Reflect',
      items: [
        { name: 'Habits & Health', href: '/habits', icon: Activity },
        { name: 'Daily Journal', href: '/journal', icon: BookOpen }
      ]
    }
  ];

  let itemCounter = 0;

  return (
    <aside className={`app-sidebar-shell ${isCollapsed ? 'w-20 px-3' : 'w-64 px-6'} bg-surface border-r border-border h-screen sticky top-0 flex flex-col justify-between py-6 sidebar-transition hidden md:flex shrink-0 self-start z-40`}>
      {/* Upper Logo & Nav Section */}
      <div className="space-y-6 overflow-y-auto max-h-[80vh] no-scrollbar">
        <div className={`flex ${isCollapsed ? 'flex-col items-center space-y-2' : 'items-center justify-between'} border-b border-border pb-3`}>
          {!isCollapsed ? (
            <div>
              <h1 className="font-amharic text-2xl font-bold tracking-tight text-primary">
                ሁሉ
              </h1>
              <p className="font-label text-xs text-secondary mt-0.5 uppercase tracking-[0.15em]">
                Life Operating System
              </p>
            </div>
          ) : (
            <h1 className="font-amharic text-2xl font-bold text-primary">
              ሁ
            </h1>
          )}

          <div className="flex items-center space-x-1">
            {!isCollapsed && <NotificationCenter />}
            <ThemeToggle />
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-secondary hover:text-primary p-1 rounded-none hover:bg-neutral-bg cursor-pointer btn-press"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Quick Capture Button */}
        <div className="px-1">
          {!isCollapsed ? (
            <button
              onClick={onCaptureTrigger}
              className="w-full bg-accent text-on-accent hover:opacity-90 transition-all font-label text-xs uppercase tracking-widest font-bold py-3 px-4 rounded-none cursor-pointer flex items-center justify-center gap-2 btn-press"
            >
              <Plus className="h-4 w-4" />
              <span>Quick Capture</span>
              <span className="text-[9px] opacity-60 ml-auto font-sans">⌥C</span>
            </button>
          ) : (
            <button
              onClick={onCaptureTrigger}
              className="w-10 h-10 mx-auto bg-accent text-on-accent hover:opacity-90 transition-all font-label text-xs font-bold rounded-none cursor-pointer flex items-center justify-center btn-press"
              title="Quick Capture (⌥C)"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-4">
          {navigationGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {!isCollapsed && (
                <span className="font-label text-[10px] text-secondary uppercase tracking-[0.2em] font-semibold px-4 block">
                  {group.groupName}
                </span>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const index = itemCounter++;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-link stagger-item flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-2.5'
                    } text-sm font-label tracking-wide rounded-none relative group ${
                      isActive
                        ? 'bg-primary text-on-primary font-bold border-l-2 border-accent'
                        : 'text-primary hover:bg-neutral-bg border-l-2 border-transparent hover:border-border'
                    }`}
                    style={{ '--stagger-i': index } as React.CSSProperties}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.name}</span>}

                    {/* Collapsed Tooltip Overlay */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider rounded-none opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Section: Life Score & Status */}
      <div className="space-y-4 pt-4 border-t border-border flex flex-col items-center">
        {/* Dynamic Life Score */}
        {!isCollapsed ? (
          <div className="bg-neutral-bg border border-border p-4 rounded-none w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.1em]">
                Life Score
              </span>
              <span className="font-display text-lg font-bold text-accent">{lifeScore}%</span>
            </div>
            <div className="w-full bg-secondary/10 h-1 rounded-none overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-500"
                style={{ width: `${lifeScore}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="text-center group relative cursor-pointer">
            <span className="font-display text-xs font-bold text-accent">{lifeScore}%</span>
            <div className="w-12 bg-secondary/10 h-1 mt-1 rounded-none overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-500"
                style={{ width: `${lifeScore}%` }}
              ></div>
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider rounded-none opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
              Life Score: {lifeScore}%
            </div>
          </div>
        )}

        {/* Log Out Button */}
        <button
          onClick={signOut}
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2.5 w-10 h-10' : 'space-x-3 px-4 py-2.5 w-full'
          } text-sm font-label tracking-wide rounded-none text-secondary hover:text-accent hover:bg-neutral-bg border border-transparent hover:border-border cursor-pointer relative group btn-press`}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Log Out</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider rounded-none opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
              Log Out
            </div>
          )}
        </button>

        {/* Connection & Sync Status Indicators */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between font-label text-xs text-secondary w-full">
            <div className="flex items-center space-x-1.5">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-success" />
                  <span className="uppercase tracking-[0.05em] text-[10px]">Cloud Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-accent" />
                  <span className="uppercase tracking-[0.05em] text-[10px] text-accent">Working Offline</span>
                </>
              )}
            </div>
            {syncPending && (
              <div className="flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin text-accent" />
                <span className="uppercase tracking-[0.05em] text-[10px] text-accent">Syncing</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 relative group cursor-pointer">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-accent" />
            )}
            {syncPending && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
            )}
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider rounded-none opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
              {isOnline ? 'Cloud Connected' : 'Working Offline'}
              {syncPending && ' (Syncing)'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
