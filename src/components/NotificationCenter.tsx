'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, Flame, BookOpen, Inbox, FileText, Clock } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import Link from 'next/link';

interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  link: string;
}

export default function NotificationCenter() {
  const { tasks, habits, habitRecords, flashcards, inboxItems, journalEntries } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  const today = getLocalDateString(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load dismissed alerts for today
  useEffect(() => {
    const stored = localStorage.getItem(`dismissed_alerts_${today}`);
    if (stored) {
      setDismissedAlerts(JSON.parse(stored));
    } else {
      // Clear old dismissed alerts
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dismissed_alerts_') && key !== `dismissed_alerts_${today}`) {
          localStorage.removeItem(key);
        }
      });
      setDismissedAlerts([]);
    }
  }, [today]);

  // Compute alerts
  useEffect(() => {
    const computedAlerts: Alert[] = [];

    // 1. Overdue tasks
    const overdueTasksCount = tasks.filter(t => t.due_date && t.due_date.split('T')[0] < today && t.status !== 'done').length;
    if (overdueTasksCount > 0) {
      computedAlerts.push({
        id: 'overdue_tasks',
        title: `${overdueTasksCount} Overdue Task${overdueTasksCount > 1 ? 's' : ''}`,
        description: 'You have tasks that missed their deadline.',
        category: 'Tasks',
        icon: <AlertTriangle className="h-4 w-4 text-tertiary" />,
        link: '/tasks'
      });
    }

    // 2. Streak at risk
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    let habitsAtRisk = 0;
    habits.forEach(h => {
      const loggedToday = habitRecords.some(r => r.habit_id === h.id && r.date === today && r.value > 0);
      const loggedYesterday = habitRecords.some(r => r.habit_id === h.id && r.date === yesterdayStr && r.value > 0);
      if (!loggedToday && loggedYesterday && !h.is_archived) {
        habitsAtRisk++;
      }
    });

    if (habitsAtRisk > 0) {
      computedAlerts.push({
        id: 'streak_risk',
        title: `${habitsAtRisk} Habit Streak${habitsAtRisk > 1 ? 's' : ''} at Risk`,
        description: 'Keep your momentum going. Log your habits today.',
        category: 'Habits',
        icon: <Flame className="h-4 w-4 text-orange-600" />,
        link: '/habits'
      });
    }

    // 3. Flashcards due
    const dueFlashcards = flashcards.filter(f => f.next_review_date && f.next_review_date.split('T')[0] <= today).length;
    if (dueFlashcards > 0) {
      computedAlerts.push({
        id: 'flashcards_due',
        title: `${dueFlashcards} Flashcard${dueFlashcards > 1 ? 's' : ''} Due`,
        description: 'Your spaced repetition queue needs attention.',
        category: 'Academy',
        icon: <BookOpen className="h-4 w-4 text-primary" />,
        link: '/academy'
      });
    }

    // 4. Inbox overflow
    const unsortedCount = inboxItems.filter(i => i.status === 'unsorted').length;
    if (unsortedCount > 10) {
      computedAlerts.push({
        id: 'inbox_overflow',
        title: 'Inbox Overflow',
        description: `You have ${unsortedCount} items awaiting triage.`,
        category: 'Inbox',
        icon: <Inbox className="h-4 w-4 text-primary" />,
        link: '/inbox'
      });
    }

    // 5. Journal not started
    const journalLogged = journalEntries.some(j => j.date === today);
    if (!journalLogged) {
      computedAlerts.push({
        id: 'journal_not_started',
        title: 'Daily Journal Pending',
        description: 'Morning intentions or evening reflections are missing.',
        category: 'Journal',
        icon: <FileText className="h-4 w-4 text-primary" />,
        link: '/journal'
      });
    }

    // 6. Snoozed woke up
    const wokeUpCount = inboxItems.filter(i => i.status === 'snoozed' && i.snoozed_until && i.snoozed_until.split('T')[0] <= today).length;
    if (wokeUpCount > 0) {
      computedAlerts.push({
        id: 'snoozed_woke_up',
        title: 'Snoozed Items Woke Up',
        description: `${wokeUpCount} item${wokeUpCount > 1 ? 's have' : ' has'} returned to your inbox.`,
        category: 'Inbox',
        icon: <Clock className="h-4 w-4 text-primary" />,
        link: '/inbox'
      });
    }

    setAlerts(computedAlerts);
  }, [tasks, habits, habitRecords, flashcards, inboxItems, journalEntries, today]);

  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link click
    e.stopPropagation();
    const newDismissed = [...dismissedAlerts, id];
    setDismissedAlerts(newDismissed);
    localStorage.setItem(`dismissed_alerts_${today}`, JSON.stringify(newDismissed));
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-press relative p-2 text-secondary hover:text-primary transition-colors cursor-pointer"
        title="Notification Center"
      >
        <Bell className="h-5 w-5" />
        {activeAlerts.length > 0 && (
          <span className="animate-badge-pulse absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-tertiary text-[8px] font-bold text-on-primary ring-2 ring-white">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="animate-dropdown absolute top-full right-0 md:right-auto md:left-0 mt-2 w-80 bg-surface border border-secondary shadow-lg rounded-sm z-50 overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-secondary/20 bg-surface">
            <span className="font-label text-xs uppercase tracking-widest text-primary font-bold">
              Notifications
            </span>
            {activeAlerts.length > 0 && (
              <span className="bg-tertiary text-on-primary text-[10px] px-1.5 py-0.5 rounded-sm font-bold">
                {activeAlerts.length} NEW
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <span className="block font-display text-md text-primary">All clear</span>
                <span className="block font-sans text-xs text-secondary mt-1">You're on track ✓</span>
              </div>
            ) : (
              <div className="divide-y divide-secondary/15">
                {activeAlerts.map(alert => (
                  <Link href={alert.link} key={alert.id} onClick={() => setIsOpen(false)}>
                    <div className="p-3 hover:bg-neutral-bg/50 transition-colors cursor-pointer group relative">
                      <div className="flex gap-3">
                        <div className="pt-0.5 shrink-0">
                          {alert.icon}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="font-label text-xs font-bold text-primary uppercase tracking-wide">
                            {alert.title}
                          </p>
                          <p className="font-sans text-xs text-secondary mt-0.5 leading-tight">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => dismissAlert(alert.id, e)}
                        className="absolute right-3 top-3 text-secondary/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Dismiss alert"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
