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
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isForcedCollapsed, setIsForcedCollapsed] = useState(false);

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

  // Keep the desktop nav usable on tighter laptop widths and heights.
  useEffect(() => {
    const handleResize = () => {
      setIsCompactLayout(window.innerWidth < 1440 || window.innerHeight < 900);
      setIsForcedCollapsed(window.innerWidth < 1280 || window.innerHeight < 680);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSidebarCollapsed = isCollapsed || isForcedCollapsed;
  const isDenseMode = isCompactLayout && !isSidebarCollapsed;

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
    <aside
      className={`app-sidebar-shell ${
        isSidebarCollapsed
          ? 'w-20 px-2 py-4 overflow-visible'
          : isDenseMode
            ? 'w-56 px-3 py-3 overflow-hidden'
            : 'w-64 px-4 py-4 overflow-hidden'
      } bg-surface/88 backdrop-blur-xl border-r border-border h-[100dvh] sticky top-0 hidden md:flex md:flex-col shrink-0 self-start z-40 sidebar-transition`}
    >
      {/* Upper Logo & Nav Section */}
      <div className={`flex min-h-0 flex-1 flex-col ${isDenseMode ? 'gap-4' : 'gap-6'}`}>
        <div
          className={`app-panel-subtle flex ${
            isSidebarCollapsed 
              ? 'flex-col items-center space-y-2.5 p-2 w-full' 
              : isDenseMode 
                ? 'px-3 py-3 w-full' 
                : 'px-4 py-4 w-full'
          }`}
        >
          {!isSidebarCollapsed ? (
            <div className="flex items-baseline gap-1.5">
              <h1 className={`font-amharic font-bold tracking-tight text-primary ${isDenseMode ? 'text-xl' : 'text-2xl'}`}>
                ሁሉ
              </h1>
              <span className="font-label text-[10px] text-secondary uppercase tracking-[0.15em] shrink-0">
                OS
              </span>
            </div>
          ) : (
            <h1 className="font-amharic text-xl font-bold text-primary">
              ሁሉ
            </h1>
          )}

          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col space-y-1.5' : 'space-x-1'}`}>
            {!isSidebarCollapsed && <NotificationCenter />}
            <ThemeToggle />
            {!isForcedCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-secondary hover:text-primary p-2 rounded-xl hover:bg-surface cursor-pointer btn-press"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Quick Capture Button */}
        {!pathname.startsWith('/oracle') && (
          <div className="px-1">
            {!isSidebarCollapsed ? (
              <button
                onClick={onCaptureTrigger}
                className={`w-full min-h-12 rounded-2xl bg-accent text-on-accent hover:opacity-95 transition-all font-label text-xs uppercase tracking-[0.18em] font-bold cursor-pointer flex items-center justify-center gap-2 btn-press shadow-[0_14px_30px_rgba(184,66,46,0.2)] ${
                  isDenseMode ? 'py-2.5 px-3' : 'py-3 px-4'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Quick Capture</span>
                <span className="text-[9px] opacity-60 ml-auto font-sans">⌥C</span>
              </button>
            ) : (
              <button
                onClick={onCaptureTrigger}
                className="w-11 h-11 mx-auto rounded-2xl bg-accent text-on-accent hover:opacity-95 transition-all font-label text-xs font-bold cursor-pointer flex items-center justify-center btn-press shadow-[0_14px_30px_rgba(184,66,46,0.2)]"
                title="Quick Capture (⌥C)"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={`flex-1 min-h-0 no-scrollbar ${
          isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'
        } ${isDenseMode ? 'space-y-3' : 'space-y-4'}`}>
          {navigationGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {!isSidebarCollapsed && (
                <span className={`font-label text-[10px] text-secondary uppercase tracking-[0.2em] font-semibold block ${
                  isDenseMode ? 'px-3' : 'px-4'
                }`}>
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
                    className={`nav-link stagger-item flex items-center relative group ${
                      isSidebarCollapsed
                        ? 'justify-center p-2.5 w-10 h-10 mx-auto rounded-none'
                        : isDenseMode
                          ? 'space-x-3 px-3 py-2 rounded-none'
                          : 'space-x-3 px-4 py-2.5 rounded-none'
                    } text-sm font-label tracking-wide ${
                      isActive
                        ? 'bg-primary text-on-primary font-bold border border-primary shadow-[0_10px_26px_rgba(26,28,30,0.16)]'
                        : 'text-primary hover:bg-surface-muted border border-transparent hover:border-border'
                    }`}
                    style={{ '--stagger-i': index } as React.CSSProperties}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isSidebarCollapsed && <span className={isDenseMode ? 'text-[13px]' : ''}>{item.name}</span>}

                    {/* Collapsed Tooltip Overlay */}
                    {isSidebarCollapsed && (
                        <div className="absolute left-full ml-2 rounded-xl px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
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
      <div className={`w-full border-t border-border ${isDenseMode ? 'pt-3' : 'pt-4'} flex flex-col items-center ${isDenseMode ? 'gap-3' : 'gap-4'}`}>
        {/* Dynamic Life Score */}
        {!isSidebarCollapsed ? (
          <div className={`app-panel-subtle w-full ${isDenseMode ? 'p-3' : 'p-4'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.1em]">
                Life Score
              </span>
              <span className={`font-display font-bold text-accent ${isDenseMode ? 'text-base' : 'text-lg'}`}>{lifeScore}%</span>
            </div>
            <div className="w-full bg-secondary/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-500"
                style={{ width: `${lifeScore}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="text-center group relative cursor-pointer">
            <span className="font-display text-xs font-bold text-accent">{lifeScore}%</span>
            <div className="w-12 bg-secondary/10 h-1.5 mt-1 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-500"
                style={{ width: `${lifeScore}%` }}
              ></div>
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 rounded-xl px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
              Life Score: {lifeScore}%
            </div>
          </div>
        )}

        {/* Log Out Button */}
        <button
          onClick={signOut}
          className={`flex items-center ${
            isSidebarCollapsed
              ? 'justify-center p-2.5 w-10 h-10 mx-auto'
              : isDenseMode
                ? 'space-x-3 px-3 py-2 w-full'
                : 'space-x-3 px-4 py-2.5 w-full'
          } text-sm font-label tracking-wide rounded-none text-secondary hover:text-accent hover:bg-surface-muted border border-transparent hover:border-border cursor-pointer relative group btn-press`}
          title={isSidebarCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isSidebarCollapsed && <span>Log Out</span>}
          {isSidebarCollapsed && (
            <div className="absolute left-full ml-2 rounded-xl px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
              Log Out
            </div>
          )}
        </button>

        {/* Connection & Sync Status Indicators */}
        {!isSidebarCollapsed ? (
          (syncPending || !isOnline) && (
            <div className="flex items-center justify-between font-label text-xs text-secondary w-full">
              <div className="flex items-center space-x-1.5">
                {!isOnline && (
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
          )
        ) : (
          (syncPending || !isOnline) && (
            <div className="flex flex-col items-center space-y-2 relative group cursor-pointer">
              {!isOnline && <WifiOff className="h-4 w-4 text-accent" />}
              {syncPending && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 rounded-xl px-2.5 py-1.5 bg-primary text-on-primary text-xs uppercase font-label tracking-wider opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap border border-border shadow-none">
                {!isOnline ? 'Working Offline' : ''}
                {syncPending && ' (Syncing)'}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
