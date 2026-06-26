'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import NotificationCenter from './NotificationCenter';
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
  X
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { isOnline, tasks, habits, habitRecords, lessons } = useDashboard();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      <header className="sticky top-0 bg-white border-b border-[#6C7278] px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-baseline space-x-2">
          <span className="font-amharic font-bold text-xl text-[#1A1C1E] tracking-tight">ሁሉ</span>
          <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.1em]">OS</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile Cloud Indicator */}
          {isOnline ? (
            <Cloud className="h-4 w-4 text-emerald-700" />
          ) : (
            <CloudOff className="h-4 w-4 text-[#B8422E]" />
          )}

          {/* Micro Life Score Badge */}
          <div className="bg-[#1A1C1E] text-white px-2 py-0.5 rounded-sm font-label text-xs font-medium tracking-wider">
            {lifeScore}%
          </div>

          <NotificationCenter />
        </div>
      </header>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#6C7278] flex justify-around items-center py-2 px-1 z-40 pb-safe shadow-md">
        {coreMenuItems.map((item) => {
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
              <span className="font-label text-xs mt-0.5 uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`flex flex-col items-center justify-center w-12 py-1 transition-all-custom rounded-sm cursor-pointer ${
            isDrawerOpen ? 'text-[#B8422E]' : 'text-[#6C7278] active:text-[#1A1C1E]'
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="font-label text-xs mt-0.5 uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* Bottom Drawer Overlay */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[9990] md:hidden"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Card */}
          <div className="fixed bottom-14 left-0 right-0 bg-white border-t-2 border-[#1A1C1E] p-5 shadow-2xl z-[9999] md:hidden rounded-t-none">
            <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-3 mb-4 font-label">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] font-semibold">
                More Sectors
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-[#6C7278] hover:text-[#1A1C1E] p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Projects', href: '/projects', icon: FolderKanban, desc: 'Sectors & boards' },
                { name: 'Academy', href: '/academy', icon: GraduationCap, desc: 'Courses & cards' },
                { name: 'Journal', href: '/journal', icon: BookOpen, desc: 'Daily log' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex flex-col items-center justify-center p-4 border rounded-sm transition-all text-center ${
                      isActive
                        ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]'
                        : 'bg-[#F7F5F2]/45 border-[#6C7278]/20 hover:border-[#1A1C1E]'
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-1.5 shrink-0" />
                    <span className="font-label text-xs uppercase font-bold tracking-wide">
                      {item.name}
                    </span>
                    <span className="font-sans text-xs text-[#6C7278] mt-0.5 lowercase">
                      {item.desc}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
