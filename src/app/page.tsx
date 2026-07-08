'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard, Task } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { 
  Square, 
  Pin, 
  PinOff, 
  ChevronRight, 
  RefreshCw, 
  SlidersHorizontal, 
  Eye, 
  EyeOff,
  ArrowRight,
  FileQuestion,
  Sparkles,
  Inbox,
  Clock,
  CheckCircle,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useSystem } from '@/context/SystemContext';
import { useToast } from '@/context/ToastContext';

import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { Input, Textarea, Select } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DashboardHome() {
  const {
    tasks,
    projects,
    courses,
    lessons,
    habits,
    habitRecords,
    courseModules,
    journalEntries,
    knowledgeItems,
    dailyDigests,
    inboxItems,
    updateTaskStatus,
    togglePinTask,
    addTask,
    addInboxItem,
    updateJournalEntry,
    upsertDailyDigest,
    reviewEntries,
    computedQueueItems,
    resolveQueueItem,
    snoozeQueueItem
  } = useDashboard();

  const { triggerRefresh, syncPending } = useSystem();
  const { showToast } = useToast();

  // ==========================================
  // WIDGET CONFIG & VISIBILITY STATE
  // ==========================================
  const [widgetsVisibility, setWidgetsVisibility] = useState({
    macroMetrics: true,
    focusEngine: true,
    sectorsSkills: true,
    dailyReflections: true,
  });
  const [showConfig, setShowConfig] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dashboard_widgets_visibility');
    if (stored) {
      try {
        setWidgetsVisibility(JSON.parse(stored));
      } catch (err) {
        console.warn('Failed to parse dashboard widgets visibility:', err);
      }
    }
  }, []);

  const toggleWidget = (key: keyof typeof widgetsVisibility) => {
    const updated = { ...widgetsVisibility, [key]: !widgetsVisibility[key] };
    setWidgetsVisibility(updated);
    localStorage.setItem('dashboard_widgets_visibility', JSON.stringify(updated));
    showToast(`Widget ${updated[key] ? 'shown' : 'hidden'}`, 'info');
  };

  // ==========================================
  // AUTO REFRESH LOGIC (Every 5 minutes)
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [triggerRefresh]);

  const handleManualRefresh = () => {
    triggerRefresh();
    showToast('Dashboard data refreshed.', 'info');
  };

  // ==========================================
  // INLINE QUICK ACTIONS STATE
  // ==========================================
  const [qaType, setQaType] = useState<'task' | 'inbox'>('task');
  const [qaTitle, setQaTitle] = useState('');
  const [qaProjId, setQaProjId] = useState('');
  const [qaPriority, setQaPriority] = useState<Task['priority']>('medium');
  const [qaDueDate, setQaDueDate] = useState('');
  const [qaNotes, setQaNotes] = useState('');
  const [qaCategory, setQaCategory] = useState<Task['category']>('Work');

  const handleQuickActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaTitle.trim()) return;

    if (qaType === 'task') {
      await addTask(
        qaProjId || undefined,
        qaTitle,
        qaNotes || undefined,
        qaPriority,
        qaDueDate || undefined,
        'none',
        undefined,
        [],
        qaCategory
      );
      showToast('Task added successfully.', 'success');
    } else {
      await addInboxItem(
        'text',
        qaTitle,
        undefined,
        qaNotes || undefined,
        [],
        'unsorted'
      );
      showToast('Inbox item captured successfully.', 'success');
    }

    // Reset Form
    setQaTitle('');
    setQaProjId('');
    setQaPriority('medium');
    setQaDueDate('');
    setQaNotes('');
  };

  // DAILY REFLECTIONS INLINE LOGGER STATE
  // ==========================================
  const todayStr = getLocalDateString();
  const todayJournal = journalEntries.find((j) => j.date === todayStr);

  const todayFocus = useMemo(() => {
    const midday = reviewEntries.find((r) => r.review_date === todayStr && r.review_type === 'midday');
    const evening = reviewEntries.find((r) => r.review_date === todayStr && r.review_type === 'evening');
    return evening?.focus_text || midday?.focus_text || todayJournal?.free_text || '';
  }, [reviewEntries, todayJournal, todayStr]);

  const [quickReflection, setQuickReflection] = useState('');
  const [isLoggingReflection, setIsLoggingReflection] = useState(false);

  const handleQuickReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReflection.trim()) return;

    setIsLoggingReflection(true);
    await updateJournalEntry(
      todayStr,
      todayJournal?.morning_intentions || [], // morning
      todayJournal?.evening_reflections_learned || [], // learned
      todayJournal?.evening_reflections_better || [], // better
      quickReflection
    );
    showToast('Reflection logged to journal.', 'success');
    setQuickReflection('');
    setIsLoggingReflection(false);
  };

  // ==========================================
  // METRIC COMPUTATIONS
  // ==========================================

  // 1. Task Progress (Weighted)
  const getWeightedProgress = (targetTasks: Task[]) => {
    if (targetTasks.length === 0) return 0;
    const weights = { high: 3, medium: 2, low: 1 };
    
    let totalWeight = 0;
    let completedWeight = 0;

    targetTasks.forEach((t) => {
      const w = weights[t.priority] || 1;
      totalWeight += w;
      if (t.status === 'done') {
        completedWeight += w;
      }
    });

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  // 2. Habit Consistency (Last 7 Days)
  const getHabitConsistency = () => {
    if (habits.length === 0) return 100;
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return getLocalDateString(d);
    });

    const totalPossible = habits.length * 7;
    let completed = 0;

    habits.forEach((h) => {
      dates.forEach((date) => {
        const record = habitRecords.find((r) => r.habit_id === h.id && r.date === date);
        if (record) {
          if (h.type === 'binary' && record.value > 0) completed += 1;
          else if (h.type === 'numeric' && record.value >= h.goal) completed += 1;
        }
      });
    });

    return Math.round((completed / totalPossible) * 100);
  };

  // 3. Learning Progress (Completed Lessons)
  const getLearningProgress = () => {
    if (lessons.length === 0) return 100;
    const completed = lessons.filter((l) => l.completed).length;
    return Math.round((completed / lessons.length) * 100);
  };

  // Composite Life Score
  const taskProgress = getWeightedProgress(tasks);
  const habitProgress = getHabitConsistency();
  const learningProgress = getLearningProgress();
  const lifeScore = Math.round(taskProgress * 0.4 + habitProgress * 0.3 + learningProgress * 0.3);

  // ==========================================
  // TODAY FOCUS FILTER
  // ==========================================
  const todayTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const isDueToday = t.due_date && t.due_date.split('T')[0] === todayStr;
    const isOverdue = t.due_date && new Date(t.due_date) < new Date(todayStr) && t.due_date.split('T')[0] !== todayStr;
    return isDueToday || isOverdue || t.is_pinned;
  });

  // ==========================================
  // 7-DAY VERTICAL BAR CHART GENERATOR
  // ==========================================
  const getLast7DaysData = () => {
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = getLocalDateString(date);
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      
      const doneOnDay = tasks.filter((t) => {
        return t.status === 'done' && t.due_date && getLocalDateString(new Date(t.due_date)) === dateString;
      });

      const taskCount = doneOnDay.length;
      days.push({ label: dayLabel, count: taskCount, dateStr: dateString });
    }

    const counts = days.map(d => d.count);
    const maxCount = Math.max(...counts, 1);
    
    return days.map((d) => ({
      ...d,
      heightPct: (d.count / maxCount) * 100
    }));
  };

  const chartData = getLast7DaysData();

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const overdueTasks = openTasks.filter((t) => {
    if (!t.due_date) return false;
    return t.due_date.split('T')[0] < todayStr;
  });
  const dueTodayTasks = openTasks.filter((t) => t.due_date?.split('T')[0] === todayStr);
  const unprocessedInbox = inboxItems.filter((i) => i.status === 'unprocessed' || i.status === 'unsorted');
  const activeProjects = projects.filter((p) => !p.is_archived && p.status !== 'completed' && p.status !== 'cancelled');
  const completedToday = tasks.filter((t) => (
    t.status === 'done' &&
    t.due_date &&
    getLocalDateString(new Date(t.due_date)) === todayStr
  ));
  const dashboardSignals = [
    {
      label: 'Open tasks',
      value: openTasks.length,
      detail: `${dueTodayTasks.length} due today`,
      href: '/tasks',
      icon: CheckCircle,
      urgent: overdueTasks.length > 0
    },
    {
      label: 'Inbox',
      value: unprocessedInbox.length,
      detail: 'needs sorting',
      href: '/inbox',
      icon: Inbox,
      urgent: unprocessedInbox.length > 0
    },
    {
      label: 'Review',
      value: computedQueueItems.length,
      detail: 'open loops',
      href: '/review',
      icon: Clock,
      urgent: computedQueueItems.length > 0
    },
    {
      label: 'Projects',
      value: activeProjects.length,
      detail: 'active sectors',
      href: '/projects',
      icon: Calendar,
      urgent: false
    }
  ];

  // Formatting date header
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).toUpperCase();

  return (
    <PageShell>
      <SectionHeader
        title="Command Dashboard"
        subtitle="Today’s operating picture"
        meta={formattedDate}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              onClick={handleManualRefresh}
              disabled={syncPending}
              className="btn-press inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.18em] text-secondary transition-all hover:border-primary hover:text-primary"
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin text-accent' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`btn-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border bg-surface px-4 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
                showConfig ? 'border-primary text-primary' : 'text-secondary border-border hover:border-primary hover:text-primary'
              }`}
              title="Customize Layout"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Layout</span>
            </button>
          </div>
        }
      />

      {/* Widget Visibility Config Box */}
      {showConfig && (
        <div className="app-panel px-5 py-5 sm:px-6 sm:py-6 animate-fade-in">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-kicker">Layout</p>
              <h2 className="mt-2 font-display text-2xl text-primary">Show only what helps you move</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-secondary">
              Keep the dashboard lean. Hide blocks you do not need for your daily operating view.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { key: 'macroMetrics', label: 'Composite Stats & Chart' },
              { key: 'focusEngine', label: 'Today Focus & Quick Capture' },
              { key: 'sectorsSkills', label: 'Projects & Academy Progress' },
              { key: 'dailyReflections', label: 'Daily Reflections (Journal)' }
            ].map((widget) => {
              const visible = widgetsVisibility[widget.key as keyof typeof widgetsVisibility];
              return (
                <button
                  key={widget.key}
                  onClick={() => toggleWidget(widget.key as keyof typeof widgetsVisibility)}
                  className={`btn-press inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2.5 text-left font-label text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                    visible
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface text-secondary border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{widget.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <section className="app-panel overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
          <div className="p-5 md:p-7 border-b xl:border-b-0 xl:border-r border-border">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="rounded-full bg-accent px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-accent">
                Command Brief
              </span>
              <span className="font-label text-[10px] text-secondary uppercase tracking-[0.16em]">
                {completedToday.length} closed today
              </span>
              {overdueTasks.length > 0 && (
                <span className="font-label text-[10px] text-danger uppercase tracking-[0.16em] font-bold">
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
            <h2 className="font-display text-[2rem] md:text-[3.25rem] font-bold text-primary leading-[0.95] max-w-3xl tracking-[-0.04em]">
              {todayFocus ? todayFocus : "Pick the most important outcome, then keep the system moving."}
            </h2>
            <p className="font-sans text-sm text-secondary max-w-2xl leading-relaxed mt-4">
              {computedQueueItems.length > 0
                ? `${computedQueueItems.length} review item${computedQueueItems.length === 1 ? '' : 's'} need a decision before they become stale.`
                : unprocessedInbox.length > 0
                  ? `${unprocessedInbox.length} captured item${unprocessedInbox.length === 1 ? '' : 's'} still need sorting.`
                  : "No urgent intake or review backlog is blocking the day."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 font-label text-xs uppercase tracking-wider font-bold">
              <Link
                href={!todayFocus ? "/review/midday" : "/review/evening"}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-5 py-3 text-center font-label text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-[0_14px_28px_rgba(184,66,46,0.2)] transition-all btn-press"
              >
                {!todayFocus ? "Start Checkpoint" : "Close the Day"}
              </Link>
              <Link
                href="/tasks?tab=today"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-primary px-5 py-3 text-center font-label text-xs font-bold uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary hover:text-on-primary btn-press"
              >
                Work Today’s Tasks
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2">
            {dashboardSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <Link
                  key={signal.label}
                  href={signal.href}
                  className="min-h-32 border-b border-r border-border even:border-r-0 xl:[&:nth-child(n+3)]:border-b-0 p-4 flex flex-col justify-between hover:bg-surface-muted/70 transition-colors btn-press"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${signal.urgent ? 'text-accent' : 'text-secondary'}`} />
                    <ArrowRight className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <div>
                    <div className={`font-display text-3xl font-bold ${signal.urgent ? 'text-accent' : 'text-primary'}`}>
                      {signal.value}
                    </div>
                    <div className="font-label text-[10px] text-secondary uppercase tracking-[0.16em] mt-1">
                      {signal.label} · {signal.detail}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==========================================
            COLUMN 1: THE MACRO METRIC
           ========================================== */}
        {widgetsVisibility.macroMetrics ? (
          <EditorialCard
            title="Operating Score"
            subtitle="Tasks · Habits · Learning"
            className="lg:col-span-4"
          >
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-6xl font-bold text-primary tracking-tight">
                  {lifeScore}%
                </h3>
                <p className="font-sans text-xs text-secondary mt-3 leading-relaxed">
                  Weighted task throughput carries 40% value, daily habit consistency 30%, and learning progress 30%.
                </p>
              </div>

              {/* Sub-Progress Badges -> Deep Linked */}
              <div className="grid grid-cols-3 gap-3 border-t border-b border-border py-4 font-label">
                <Link href="/tasks?tab=today" className="text-center group block btn-press">
                  <span className="text-[10px] text-secondary group-hover:text-accent uppercase tracking-wider block mb-1">Tasks</span>
                  <span className="text-sm font-bold text-primary group-hover:text-accent underline decoration-dotted">{taskProgress}%</span>
                </Link>
                <Link href="/habits" className="text-center group block btn-press">
                  <span className="text-[10px] text-secondary group-hover:text-accent uppercase tracking-wider block mb-1">Habits</span>
                  <span className="text-sm font-bold text-primary group-hover:text-accent underline decoration-dotted">{habitProgress}%</span>
                </Link>
                <Link href="/academy" className="text-center group block btn-press">
                  <span className="text-[10px] text-secondary group-hover:text-accent uppercase tracking-wider block mb-1">Academy</span>
                  <span className="text-sm font-bold text-primary group-hover:text-accent underline decoration-dotted">{learningProgress}%</span>
                </Link>
              </div>

              {/* 7-Day Completion Bar Chart */}
              <div className="space-y-3">
                <span className="font-label text-xs text-secondary uppercase tracking-wider block font-semibold">
                  7-Day Task Completion
                </span>
                <div className="h-28 flex items-end justify-between px-2 pt-2 border-b border-border">
                  {chartData.map((day) => (
                    <div key={day.dateStr} className="flex flex-col items-center flex-1 group">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary text-on-primary text-[10px] font-label px-1 py-0.5 mb-1 shrink-0">
                        {day.count}
                      </span>
                      <div className="w-4 bg-secondary/10 h-20 flex items-end">
                        <div
                          className="w-full bg-primary hover:bg-accent transition-colors"
                          style={{ height: `${day.heightPct}%` }}
                        ></div>
                      </div>
                      <span className="font-label text-[10px] text-secondary mt-2 tracking-tighter">
                        {day.label.slice(0, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </EditorialCard>
        ) : (
          <div className="lg:col-span-4">
            <EmptyState
              title="Metrics widget hidden"
              description="Restore this dashboard panel when you want your macro metrics back in view."
              action={<SecondaryButton onClick={() => toggleWidget('macroMetrics')}>Restore Widget</SecondaryButton>}
            />
          </div>
        )}

        {/* ==========================================
            COLUMN 2: TODAY FOCUS & INLINE QUICK ADD
           ========================================== */}
        {widgetsVisibility.focusEngine ? (
          <EditorialCard
            title="Now / Next"
            subtitle={`${todayTasks.length} active focus item${todayTasks.length === 1 ? '' : 's'}`}
            className="lg:col-span-5"
          >
            <div className="space-y-6">
              <div className="space-y-3 pr-1 max-h-[420px] overflow-y-auto">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => {
                    const parentProject = projects.find((p) => p.id === task.project_id);
                    return (
                      <div
                        key={task.id}
                        className="app-panel-subtle flex items-start space-x-3 p-4 group transition-all hover:border-primary"
                      >
                        <button
                          onClick={() => {
                            updateTaskStatus(task.id, 'done');
                            showToast('Task marked complete.', 'success', {
                              label: 'Undo',
                              onClick: () => updateTaskStatus(task.id, 'todo')
                            });
                          }}
                          className="text-secondary hover:text-accent shrink-0 mt-0.5 cursor-pointer btn-press"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-sans text-xs font-semibold text-primary truncate">
                              {task.name}
                            </span>
                            {task.is_pinned && <Pin className="h-3 w-3 text-accent fill-accent" />}
                          </div>
                          
                          {task.description && (
                            <p className="font-sans text-[11px] text-secondary line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <StatusBadge status={task.priority} type="priority" />
                            {parentProject && (
                              <Link
                                href={`/projects?projectId=${parentProject.id}`}
                                className="font-label text-[10px] text-on-accent bg-secondary hover:bg-primary transition-colors px-1 py-0.5 uppercase tracking-wide truncate max-w-[120px]"
                              >
                                {parentProject.name}
                              </Link>
                            )}
                            {task.category && (
                              <StatusBadge status={task.category} type="category" />
                            )}
                            {task.due_date && (
                              <span className="font-label text-[10px] text-secondary shrink-0">
                                Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            togglePinTask(task.id);
                            showToast('Task unpinned.', 'info');
                          }}
                          className="opacity-0 group-hover:opacity-100 text-secondary hover:text-accent transition-all cursor-pointer btn-press"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    title="All focus items completed"
                    description="Your current focus queue is clear. Open the task workspace if you want to pull in another item."
                    action={<SecondaryButton onClick={() => { window.location.href = '/tasks?tab=today'; }}>View Tasks Workspace</SecondaryButton>}
                  />
                )}
              </div>

              {/* Dashboard Quick Actions Form */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-label text-xs text-secondary uppercase tracking-wider block font-semibold">
                    Capture Without Leaving
                  </span>
                  <span className="font-label text-[10px] text-secondary uppercase tracking-wider">
                    {qaType === 'task' ? 'Task' : 'Inbox'}
                  </span>
                </div>
                <form onSubmit={handleQuickActionSubmit} className="space-y-3 font-label text-xs">
                  <div className="flex rounded-2xl border border-border bg-surface p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setQaType('task')}
                      className={`flex-1 rounded-xl py-2 flex items-center justify-center transition-all ${
                        qaType === 'task' ? 'bg-primary text-on-primary font-bold shadow-[0_10px_24px_rgba(26,28,30,0.12)]' : 'text-primary hover:bg-surface-muted'
                      }`}
                    >
                      TASK
                    </button>
                    <button
                      type="button"
                      onClick={() => setQaType('inbox')}
                      className={`flex-1 rounded-xl py-2 flex items-center justify-center transition-all ${
                        qaType === 'inbox' ? 'bg-primary text-on-primary font-bold shadow-[0_10px_24px_rgba(26,28,30,0.12)]' : 'text-primary hover:bg-surface-muted'
                      }`}
                    >
                      INBOX ITEM
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={qaTitle}
                      onChange={(e) => setQaTitle(e.target.value)}
                      placeholder={qaType === 'task' ? "Task name..." : "Thought / URL capture..."}
                      required
                    />
                    
                    {qaType === 'task' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={qaProjId}
                          onChange={(e) => setQaProjId(e.target.value)}
                          className="text-xs"
                          options={[
                            { value: '', label: 'Standalone (None)' },
                            ...projects.map((p) => ({ value: p.id, label: p.name }))
                          ]}
                        />
                        <Select
                          value={qaCategory}
                          onChange={(e) => setQaCategory(e.target.value as Task['category'])}
                          className="text-xs"
                          options={[
                            { value: 'Work', label: 'Work' },
                            { value: 'Personal', label: 'Personal' },
                            { value: 'Urgent', label: 'Urgent' },
                            { value: 'Learning', label: 'Learning' },
                            { value: 'Other', label: 'Other' }
                          ]}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        value={qaNotes}
                        onChange={(e) => setQaNotes(e.target.value)}
                        placeholder={qaType === 'task' ? "Description (optional)..." : "Notes / URL detail..."}
                        className="flex-1 text-xs"
                      />
                      {/* One accent action per screen: Add Button is Accent Crimson/Coral */}
                      <PrimaryButton type="submit" className="shrink-0">
                        ADD
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </EditorialCard>
        ) : (
          <div className="lg:col-span-5">
            <EmptyState
              title="Focus widget hidden"
              description="Restore this panel when you want your current task queue and quick capture tools back on the home screen."
              action={<SecondaryButton onClick={() => toggleWidget('focusEngine')}>Restore Widget</SecondaryButton>}
            />
          </div>
        )}

        {/* ==========================================
            COLUMN 3: SECTORS & REFLECTIONS
           ========================================== */}
        <div className="lg:col-span-3 space-y-6 flex flex-col justify-start">

          {/* Projects & Academy Progress Widget */}
          {widgetsVisibility.sectorsSkills ? (
            <EditorialCard
              title="Projects & Learning"
              subtitle="Sectors & Skills"
            >
              <div className="space-y-6">
                {/* Projects list */}
                <div className="space-y-4">
                  <span className="font-label text-xs text-secondary uppercase tracking-wider block font-semibold">
                    Active Projects
                  </span>
                  
                  {activeProjects.length > 0 ? (
                    activeProjects.slice(0, 3).map((proj) => {
                      const projTasks = tasks.filter((t) => t.project_id === proj.id);
                      const progress = getWeightedProgress(projTasks);
                      return (
                        <div key={proj.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-baseline mb-1 gap-3">
                            <span className="font-sans text-xs font-semibold text-primary truncate hover:text-accent">
                              <Link href={`/projects?projectId=${proj.id}`}>{proj.name}</Link>
                            </span>
                            <span className="font-label text-xs font-bold text-accent shrink-0">{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No active projects"
                      description="Active projects will appear here once you have open work in motion."
                    />
                  )}
                </div>

                {/* Academy Course Progress */}
                <div className="space-y-4 border-t border-border pt-4">
                  <span className="font-label text-xs text-secondary uppercase tracking-wider block font-semibold">
                    Learning Progress
                  </span>

                  {courses.length > 0 ? (
                    courses.slice(0, 2).map((course) => {
                      const courseLessons = lessons.filter(l => {
                        const m = l.module_id;
                        const matchedMod = courseModules.find(cm => cm.id === m);
                        return matchedMod && matchedMod.course_id === course.id;
                      });
                      const progress = courseLessons.length > 0
                        ? Math.round((courseLessons.filter(l => l.completed).length / courseLessons.length) * 100)
                        : 0;

                      return (
                        <div key={course.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-baseline mb-1 gap-3">
                            <span className="font-sans text-xs font-semibold text-primary truncate hover:text-accent">
                              <Link href={`/academy?courseId=${course.id}`}>{course.title}</Link>
                            </span>
                            <span className="font-label text-xs font-bold text-accent shrink-0">{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No courses yet"
                      description="Your active learning tracks will appear here once courses are added."
                    />
                  )}
                </div>

                <div className="pt-2">
                  <Link
                    href="/habits"
                    className="w-full flex items-center justify-between rounded-2xl border border-primary hover:bg-primary hover:text-on-primary transition-all py-3 px-4 font-label text-xs tracking-wider uppercase"
                  >
                    <span>Track Habits & Health</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </EditorialCard>
          ) : (
            <EmptyState
              title="Projects and learning hidden"
              description="Restore this panel when you want your project and course progress back on the dashboard."
              action={<SecondaryButton onClick={() => toggleWidget('sectorsSkills')}>Restore Widget</SecondaryButton>}
            />
          )}

          {/* Daily Reflections / Journal Prompt Widget */}
          {widgetsVisibility.dailyReflections ? (
            <EditorialCard
              title="Daily Reflections"
              subtitle="Self Reflection"
            >
              <div className="space-y-4">
                {todayJournal ? (
                  <div className="app-panel-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-label text-xs text-success font-bold uppercase tracking-wide">✓ Completed Today</span>
                      <Link href="/journal" className="font-label text-xs text-accent hover:underline uppercase font-bold tracking-wider">Full Log</Link>
                    </div>
                    <p className="font-sans text-xs text-primary italic leading-relaxed">
                      {todayJournal.free_text || 'Morning intentions or reflections logged without diary notes.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleQuickReflectionSubmit} className="space-y-3 font-label text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-sans text-xs text-secondary italic">No reflections logged today.</span>
                      <Link href="/journal" className="font-label text-xs text-accent hover:underline uppercase font-bold tracking-wider">Full Editor</Link>
                    </div>
                    <Textarea
                      value={quickReflection}
                      onChange={(e) => setQuickReflection(e.target.value)}
                      placeholder="Log a quick daily thought or reflection here..."
                      required
                      rows={3}
                      className="text-xs resize-none"
                    />
                    <PrimaryButton
                      type="submit"
                      disabled={isLoggingReflection || !quickReflection.trim()}
                      className="w-full"
                    >
                      {isLoggingReflection ? 'LOGGING...' : 'LOG REFLECTION'}
                    </PrimaryButton>
                  </form>
                )}
              </div>
            </EditorialCard>
          ) : (
            <EmptyState
              title="Reflections widget hidden"
              description="Restore this panel when you want daily journaling prompts back on the dashboard."
              action={<SecondaryButton onClick={() => toggleWidget('dailyReflections')}>Restore Widget</SecondaryButton>}
            />
          )}
        </div>

        {/* =======================================================
            FULL WIDTH LOWER SECTION: DAILY BRIEFING & LEDGER
           ======================================================= */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-primary pt-6 mt-2">
          
          {/* DAILY BRIEFING WIDGET */}
          <EditorialCard
            title="Today's Briefing"
            subtitle="Intelligent Agenda Summary"
          >
            <DashboardBriefing 
              tasks={tasks}
              projects={projects}
              inboxItems={inboxItems}
              dailyDigests={dailyDigests}
              upsertDailyDigest={upsertDailyDigest}
              todayStr={todayStr}
              lessons={lessons}
            />
          </EditorialCard>

          {/* LEARNING LEDGER WIDGET */}
          <EditorialCard
            title="Learning Ledger"
            subtitle="Today's Knowledge Output"
          >
            <DashboardLedger 
              inboxItems={inboxItems}
              tasks={tasks}
              knowledgeItems={knowledgeItems}
              dailyDigests={dailyDigests}
              upsertDailyDigest={upsertDailyDigest}
              todayStr={todayStr}
            />
          </EditorialCard>

        </div>

      </div>
    </PageShell>
  );
}

// ==========================================
// SUB-WIDGET COMPONENTS
// ==========================================

interface BriefingProps {
  tasks: Task[];
  projects: any[];
  inboxItems: any[];
  dailyDigests: any[];
  upsertDailyDigest: any;
  todayStr: string;
  lessons: any[];
}

function DashboardBriefing({ tasks, projects, inboxItems, dailyDigests, upsertDailyDigest, todayStr, lessons }: BriefingProps) {
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  const todayDigest = useMemo(() => {
    return dailyDigests.find((d) => d.date === todayStr) || null;
  }, [dailyDigests, todayStr]);

  useEffect(() => {
    if (todayDigest) {
      setSummaryText(todayDigest.summary || '');
    }
  }, [todayDigest]);

  const unprocessedCount = inboxItems.filter((i) => i.status === 'unprocessed' || i.status === 'unsorted').length;
  
  // Projects with upcoming deadlines (within next 14 days)
  const urgentProjects = useMemo(() => {
    const fourteenDaysLater = new Date();
    fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);
    
    return projects.filter((p) => {
      if (p.is_archived || p.status === 'completed' || p.status === 'cancelled') return false;
      if (!p.deadline) return false;
      const d = new Date(p.deadline);
      return d >= new Date(todayStr) && d <= fourteenDaysLater;
    });
  }, [projects, todayStr]);

  const lessonsCompletedToday = lessons.filter(l => l.completed && l.created_at && l.created_at.split('T')[0] === todayStr).length;

  const handleSaveSummary = async () => {
    try {
      await upsertDailyDigest(todayStr, {
        summary: summaryText
      });
      setIsEditingSummary(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      
      {/* Metrics Strip */}
      <div className="grid grid-cols-2 gap-4 border-b border-border pb-4 font-label text-[10px] uppercase font-bold">
        <div className="app-panel-subtle p-3 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Unprocessed slips</span>
          <span className={`text-xl font-bold mt-1 ${unprocessedCount > 0 ? 'text-accent' : 'text-primary'}`}>{unprocessedCount} items</span>
        </div>
        <div className="app-panel-subtle p-3 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Lessons Finished</span>
          <span className="text-xl font-bold text-success mt-1">{lessonsCompletedToday} today</span>
        </div>
      </div>

      {/* Editor for learning digest summary */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold">Focus / Learning Summary</span>
          {!isEditingSummary ? (
            <button 
              type="button"
              onClick={() => setIsEditingSummary(true)} 
              className="text-accent underline font-label text-[9px] uppercase font-bold cursor-pointer hover:opacity-85"
            >
              Edit Summary
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleSaveSummary} 
                className="text-success underline font-label text-[9px] uppercase font-bold cursor-pointer"
              >
                Save
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSummaryText(todayDigest?.summary || '');
                  setIsEditingSummary(false);
                }} 
                className="text-secondary underline font-label text-[9px] uppercase font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {!isEditingSummary ? (
          <div className="app-panel-subtle leading-relaxed text-secondary italic">
            {summaryText || "Log today's brief summary focus, learning highlights, or macro intentions..."}
          </div>
        ) : (
          <Textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            placeholder="What is your focus and what did you learn today?"
            rows={3}
            className="text-xs resize-none"
          />
        )}
      </div>

      {/* Project signals */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold block">Project Signals</span>
        {urgentProjects.length > 0 ? (
          <div className="space-y-2">
            {urgentProjects.map((p) => (
              <div key={p.id} className="app-panel-subtle flex justify-between items-center">
                <span className="font-sans font-semibold text-primary truncate hover:text-accent">
                  <Link href={`/projects/${p.id}`}>{p.name}</Link>
                </span>
                <span className="font-label text-[9px] text-danger font-bold uppercase shrink-0">
                  Due: {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-sans text-[11px] text-secondary italic">No active projects with deadlines in the next 14 days.</p>
        )}
      </div>

      {/* Review Quick Action links */}
      <div className="pt-2 border-t border-border flex justify-between items-center flex-wrap gap-2">
        <span className="font-sans text-[11px] text-secondary">Need to clean up your intake queue?</span>
        <div className="flex gap-2">
          <Link 
            href="/inbox" 
            className="font-label text-[9px] uppercase font-bold text-secondary hover:opacity-85 flex items-center gap-1 rounded-xl border border-border px-3 py-2 bg-surface"
          >
            <span>Triage Desk</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link 
            href="/intelligence" 
            className="font-label text-[9px] uppercase font-bold text-accent hover:opacity-85 flex items-center gap-1 rounded-xl border border-accent/20 px-3 py-2 bg-accent/5"
          >
            <span>Briefing Feed</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link 
            href="/review" 
            className="font-label text-[9px] uppercase font-bold text-secondary hover:opacity-85 flex items-center gap-1 rounded-xl border border-border px-3 py-2 bg-surface"
          >
            <span>Review Room</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}

interface LedgerProps {
  inboxItems: any[];
  tasks: any[];
  knowledgeItems: any[];
  dailyDigests: any[];
  upsertDailyDigest: any;
  todayStr: string;
}

function DashboardLedger({ inboxItems, tasks, knowledgeItems, dailyDigests, upsertDailyDigest, todayStr }: LedgerProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newInsight, setNewInsight] = useState('');

  const todayDigest = useMemo(() => {
    return dailyDigests.find((d) => d.date === todayStr) || null;
  }, [dailyDigests, todayStr]);

  const questions = todayDigest?.open_questions || [];
  const insights = todayDigest?.important_insights || [];

  // Metrics calculations
  const capturedToday = inboxItems.filter((i) => i.created_at.split('T')[0] === todayStr).length;
  const processedToday = inboxItems.filter((i) => i.processed_at && i.processed_at.split('T')[0] === todayStr).length;
  const notesCreatedToday = knowledgeItems.filter((k) => k.created_at.split('T')[0] === todayStr).length;
  const tasksCreatedFromInboxToday = tasks.filter((t) => t.inbox_item_id && t.created_at && t.created_at.split('T')[0] === todayStr).length;

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      await upsertDailyDigest(todayStr, {
        open_questions: [...questions, newQuestion.trim()]
      });
      setNewQuestion('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveQuestion = async (index: number) => {
    try {
      const updated = (questions as string[]).filter((_: string, i: number) => i !== index);
      await upsertDailyDigest(todayStr, {
        open_questions: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsight.trim()) return;
    try {
      await upsertDailyDigest(todayStr, {
        important_insights: [...insights, newInsight.trim()]
      });
      setNewInsight('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveInsight = async (index: number) => {
    try {
      const updated = (insights as string[]).filter((_: string, i: number) => i !== index);
      await upsertDailyDigest(todayStr, {
        important_insights: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      
      {/* Activity Count Summary */}
      <div className="grid grid-cols-4 gap-2 border-b border-border pb-4 font-label text-[9px] uppercase font-bold text-center">
        <div className="app-panel-subtle p-3">
          <span className="text-secondary block">Captured</span>
          <span className="text-md font-bold text-primary block mt-0.5">{capturedToday}</span>
        </div>
        <div className="app-panel-subtle p-3">
          <span className="text-secondary block">Processed</span>
          <span className="text-md font-bold text-primary block mt-0.5">{processedToday}</span>
        </div>
        <div className="app-panel-subtle p-3">
          <span className="text-secondary block">Notes</span>
          <span className="text-md font-bold text-primary block mt-0.5">{notesCreatedToday}</span>
        </div>
        <div className="app-panel-subtle p-3">
          <span className="text-secondary block">Tasks Made</span>
          <span className="text-md font-bold text-primary block mt-0.5">{tasksCreatedFromInboxToday}</span>
        </div>
      </div>

      {/* Open Questions List */}
      <div className="space-y-2">
        <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold block flex items-center gap-1">
          <FileQuestion className="h-3.5 w-3.5 text-danger shrink-0" />
          <span>Open Inquiry / Questions Today</span>
        </span>
        
        {questions.length > 0 && (
          <div className="space-y-2 app-panel-subtle max-h-[140px] overflow-y-auto">
            {questions.map((q: string, i: number) => (
              <div key={i} className="flex justify-between items-start gap-2 border-b border-border/40 py-2 last:border-b-0">
                <span className="text-primary italic leading-relaxed shrink-1 shrink-0">{q}</span>
                <button 
                  type="button"
                  onClick={() => handleRemoveQuestion(i)} 
                  className="text-secondary hover:text-danger shrink-0 font-label text-[8px] font-bold uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddQuestion} className="flex gap-2">
          <Input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Log an open question to solve..."
            className="flex-1 text-xs"
          />
          <SecondaryButton type="submit" className="px-4">
            Add
          </SecondaryButton>
        </form>
      </div>

      {/* Important Insights List */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold block flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-warning shrink-0" />
          <span>Important Insights Today</span>
        </span>

        {insights.length > 0 && (
          <div className="space-y-2 app-panel-subtle max-h-[140px] overflow-y-auto">
            {insights.map((ins: string, i: number) => (
              <div key={i} className="flex justify-between items-start gap-2 border-b border-border/40 py-2 last:border-b-0">
                <span className="text-primary leading-relaxed shrink-1 shrink-0">{ins}</span>
                <button 
                  type="button"
                  onClick={() => handleRemoveInsight(i)} 
                  className="text-secondary hover:text-danger shrink-0 font-label text-[8px] font-bold uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddInsight} className="flex gap-2">
          <Input
            type="text"
            value={newInsight}
            onChange={(e) => setNewInsight(e.target.value)}
            placeholder="Log a key takeaway / insight..."
            className="flex-1 text-xs"
          />
          <SecondaryButton type="submit" className="px-4">
            Add
          </SecondaryButton>
        </form>
      </div>

    </div>
  );
}
