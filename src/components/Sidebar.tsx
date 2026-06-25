'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
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
  RefreshCw
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    isOnline,
    syncPending,
    tasks,
    habits,
    habitRecords,
    lessons
  } = useDashboard();

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

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inbox Triage', href: '/inbox', icon: Inbox },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'The Academy', href: '/academy', icon: GraduationCap },
    { name: 'Habits & Health', href: '/habits', icon: Activity },
    { name: 'Daily Journal', href: '/journal', icon: BookOpen }
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#6C7278] min-h-screen flex flex-col justify-between p-6 hidden md:flex">
      {/* Upper Logo & Nav Section */}
      <div className="space-y-8">
        <div>
          <h1 className="font-amharic text-2xl font-bold tracking-tight text-[#1A1C1E] border-b border-[#6C7278] pb-3">
            ሁሉ
          </h1>
          <p className="font-label text-[10px] text-[#6C7278] mt-1 uppercase tracking-[0.15em]">
            Life Operating System
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 text-sm font-label tracking-wide transition-all-custom rounded-sm ${
                  isActive
                    ? 'bg-[#1A1C1E] text-white'
                    : 'text-[#1A1C1E] hover:bg-[#F7F5F2] border border-transparent hover:border-[#6C7278]/25'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Section: Life Score & Status */}
      <div className="space-y-6 pt-6 border-t border-[#6C7278]">
        {/* Dynamic Life Score */}
        <div className="bg-[#F7F5F2] border border-[#6C7278]/30 p-4 rounded-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.1em]">
              Life Score
            </span>
            <span className="font-display text-lg font-bold text-[#B8422E]">{lifeScore}%</span>
          </div>
          {/* Flat horizontal bar */}
          <div className="w-full bg-[#6C7278]/20 h-1.5 rounded-none overflow-hidden">
            <div
              className="bg-[#B8422E] h-full transition-all duration-500"
              style={{ width: `${lifeScore}%` }}
            ></div>
          </div>
        </div>

        {/* Connection & Sync Status Indicators */}
        <div className="flex items-center justify-between font-label text-[10px] text-[#6C7278]">
          <div className="flex items-center space-x-1.5">
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-700" />
                <span className="uppercase tracking-[0.05em]">Cloud Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[#B8422E]" />
                <span className="uppercase tracking-[0.05em] text-[#B8422E]">Working Offline</span>
              </>
            )}
          </div>
          {syncPending && (
            <div className="flex items-center space-x-1">
              <RefreshCw className="h-3 w-3 animate-spin text-[#B8422E]" />
              <span className="uppercase tracking-[0.05em] text-[#B8422E]">Syncing</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
