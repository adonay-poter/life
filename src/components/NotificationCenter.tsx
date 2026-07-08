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
        className="btn-press relative flex h-10 w-10 items-center justify-center rounded-xl text-secondary transition-colors cursor-pointer hover:bg-surface hover:text-primary"
        title="Notification Center"
      >
        <Bell className="h-5 w-5" />
        {activeAlerts.length > 0 && (
          <span className="animate-badge-pulse absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-on-accent ring-2 ring-white">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="animate-dropdown absolute right-0 top-full z-50 mt-3 w-[22rem] overflow-hidden rounded-[24px] border border-border bg-surface shadow-[0_24px_60px_rgba(26,28,30,0.18)] md:left-0 md:right-auto">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-4">
            <span className="font-label text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Notifications
            </span>
            {activeAlerts.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.16em] text-on-accent">
                {activeAlerts.length} New
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="block font-display text-xl text-primary">All clear</span>
                <span className="mt-2 block text-sm text-secondary">Nothing urgent is pulling you off course.</span>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {activeAlerts.map(alert => (
                  <Link href={alert.link} key={alert.id} onClick={() => setIsOpen(false)}>
                    <div className="group relative cursor-pointer px-4 py-4 transition-colors hover:bg-neutral-bg/50">
                      <div className="flex gap-3">
                        <div className="pt-0.5 shrink-0">
                          {alert.icon}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="font-label text-xs font-bold text-primary uppercase tracking-[0.16em]">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-secondary">
                            {alert.description}
                          </p>
                          <p className="mt-2 font-label text-[10px] uppercase tracking-[0.16em] text-secondary/80">
                            {alert.category}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => dismissAlert(alert.id, e)}
                        className="absolute right-3 top-3 rounded-xl p-1 text-secondary/50 opacity-0 transition-opacity cursor-pointer hover:bg-surface hover:text-primary group-hover:opacity-100"
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
