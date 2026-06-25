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
  Cloud,
  CloudOff
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { isOnline, tasks, habits, habitRecords, lessons } = useDashboard();

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

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Academy', href: '/academy', icon: GraduationCap },
    { name: 'Habits', href: '/habits', icon: Activity },
    { name: 'Journal', href: '/journal', icon: BookOpen }
  ];

  return (
    <div className="md:hidden flex flex-col shrink-0">
      {/* Top Mobile Header */}
      <header className="sticky top-0 bg-white border-b border-[#6C7278] px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-baseline space-x-2">
          <span className="font-display font-bold text-xl text-[#1A1C1E] tracking-tight">HERITAGE</span>
          <span className="font-label text-[9px] text-[#6C7278] uppercase tracking-[0.1em]">OS</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile Cloud Indicator */}
          {isOnline ? (
            <Cloud className="h-4 w-4 text-emerald-700" />
          ) : (
            <CloudOff className="h-4 w-4 text-[#B8422E]" />
          )}

          {/* Micro Life Score Badge */}
          <div className="bg-[#1A1C1E] text-white px-2 py-0.5 rounded-sm font-label text-[10px] font-medium tracking-wider">
            {lifeScore}%
          </div>
        </div>
      </header>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#6C7278] flex justify-around items-center py-2 px-1 z-40 pb-safe shadow-md">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 py-1 transition-all-custom rounded-sm ${
                isActive ? 'text-[#B8422E]' : 'text-[#6C7278] active:text-[#1A1C1E]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-label text-[9px] mt-0.5 uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
