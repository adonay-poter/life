'use client';

import React, { useState, useEffect } from 'react';
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
  Check, 
  X, 
  Timer
} from 'lucide-react';
import Link from 'next/link';
import { useSystem } from '@/context/SystemContext';
import { useToast } from '@/context/ToastContext';

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
    updateTaskStatus,
    togglePinTask,
    addTask,
    addInboxItem,
    updateJournalEntry
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
  const [isVisibilityLoaded, setIsVisibilityLoaded] = useState(false);

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
    setIsVisibilityLoaded(true);
  }, []);

  const toggleWidget = (key: keyof typeof widgetsVisibility) => {
    const updated = { ...widgetsVisibility, [key]: !widgetsVisibility[key] };
    setWidgetsVisibility(updated);
    localStorage.setItem('dashboard_widgets_visibility', JSON.stringify(updated));
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

  // ==========================================
  // DAILY REFLECTIONS INLINE LOGGER STATE
  // ==========================================
  const todayStr = getLocalDateString();
  const todayJournal = journalEntries.find((j) => j.date === todayStr);

  const [quickReflection, setQuickReflection] = useState('');
  const [isLoggingReflection, setIsLoggingReflection] = useState(false);

  const handleQuickReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReflection.trim()) return;

    setIsLoggingReflection(true);
    await updateJournalEntry(
      todayStr,
      [], // morning
      [], // learned
      [], // better
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

  // Formatting date header
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).toUpperCase();

  return (
    <div className="space-y-12">
      {/* Broadsheet Style Top Header with Refresh & Customize */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col md:flex-row justify-between items-baseline gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            THE DAILY MONITOR
          </h2>
          <p className="font-label text-xs text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Architecture of Self &mdash; Vol. CLXIX &bull; No. 1
          </p>
        </div>

        <div className="flex items-center space-x-3 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={syncPending}
              className="text-[#6C7278] hover:text-[#1A1C1E] p-1.5 border border-[#6C7278]/25 hover:border-[#1A1C1E] transition-all rounded-sm bg-white cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin text-[#B8422E]' : ''}`} />
            </button>

            {/* Customize Widgets Button */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 border transition-all rounded-sm bg-white cursor-pointer flex items-center space-x-1 ${
                showConfig ? 'border-[#1A1C1E] text-[#1A1C1E]' : 'text-[#6C7278] border-[#6C7278]/25 hover:border-[#1A1C1E]'
              }`}
              title="Customize Layout"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-label text-xs uppercase font-bold tracking-wider hidden sm:inline">Customize</span>
            </button>
          </div>

          <div className="font-label text-xs text-[#1A1C1E] font-medium tracking-wider pl-3 border-l border-[#6C7278]/30">
            {formattedDate}
          </div>
        </div>
      </header>

      {/* Widget Visibility Config Box */}
      {showConfig && (
        <div className="bg-white border-2 border-[#1A1C1E] p-5 font-label text-xs space-y-3 shadow-md animate-fade-in">
          <span className="block font-bold text-sm uppercase text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
            Customize Dashboard Layout
          </span>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { key: 'macroMetrics', label: 'Composite Stats & Chart' },
              { key: 'focusEngine', label: 'Today Focus & Quick Capture' },
              { key: 'sectorsSkills', label: 'Projects & Academy Progress' },
              { key: 'dailyReflections', label: 'Daily Reflections (Journal)' },
            ].map((widget) => {
              const visible = widgetsVisibility[widget.key as keyof typeof widgetsVisibility];
              return (
                <button
                  key={widget.key}
                  onClick={() => toggleWidget(widget.key as keyof typeof widgetsVisibility)}
                  className={`px-3 py-1.5 border flex items-center space-x-2 transition-all uppercase font-bold rounded-sm cursor-pointer ${
                    visible
                      ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]'
                      : 'bg-white text-[#6C7278] border-[#6C7278]/30 hover:border-[#1A1C1E]'
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1: THE MACRO METRIC
           ========================================== */}
        {widgetsVisibility.macroMetrics ? (
          <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-8 rounded-sm">
            <div>
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
                Composite Integrity
              </span>
              <h3 className="font-display text-6xl font-bold text-[#1A1C1E] tracking-tight">
                {lifeScore}%
              </h3>
              <p className="font-sans text-xs text-[#6C7278] mt-3 leading-relaxed">
                Calculated dynamically. Weighted task throughput carries 40% value, daily habit consistency 30%, and learning progress 30%.
              </p>
            </div>

            {/* Sub-Progress Badges -> Deep Linked */}
            <div className="grid grid-cols-3 gap-3 border-t border-b border-[#6C7278]/20 py-4 font-label">
              <Link href="/tasks?tab=today" className="text-center group hover:scale-105 transition-transform block">
                <span className="text-xs text-[#6C7278] group-hover:text-[#B8422E] uppercase tracking-wider block mb-1">Tasks</span>
                <span className="text-sm font-bold text-[#1A1C1E] group-hover:text-[#B8422E] underline decoration-dotted">{taskProgress}%</span>
              </Link>
              <Link href="/habits" className="text-center group hover:scale-105 transition-transform block">
                <span className="text-xs text-[#6C7278] group-hover:text-[#B8422E] uppercase tracking-wider block mb-1">Habits</span>
                <span className="text-sm font-bold text-[#1A1C1E] group-hover:text-[#B8422E] underline decoration-dotted">{habitProgress}%</span>
              </Link>
              <Link href="/academy" className="text-center group hover:scale-105 transition-transform block">
                <span className="text-xs text-[#6C7278] group-hover:text-[#B8422E] uppercase tracking-wider block mb-1">Academy</span>
                <span className="text-sm font-bold text-[#1A1C1E] group-hover:text-[#B8422E] underline decoration-dotted">{learningProgress}%</span>
              </Link>
            </div>

            {/* 7-Day Completion Bar Chart */}
            <div>
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-4">
                7-Day Task Completion
              </span>
              <div className="h-28 flex items-end justify-between px-2 pt-2 border-b border-[#6C7278]">
                {chartData.map((day) => (
                  <div key={day.dateStr} className="flex flex-col items-center flex-1 group">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#1A1C1E] text-white text-xs font-label px-1 py-0.5 mb-1 shrink-0">
                      {day.count}
                    </span>
                    <div className="w-4 bg-[#6C7278]/20 h-24 flex items-end">
                      <div
                        className="w-full bg-[#1A1C1E] hover:bg-[#B8422E] transition-colors"
                        style={{ height: `${day.heightPct}%` }}
                      ></div>
                    </div>
                    <span className="font-label text-xs text-[#6C7278] mt-2 tracking-tighter">
                      {day.label.slice(0, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="bg-[#F7F5F2]/45 border border-dashed border-[#6C7278]/30 p-6 flex flex-col justify-center items-center text-center rounded-sm min-h-[300px]">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-widest block mb-2">Metrics Widget Hidden</span>
            <button onClick={() => toggleWidget('macroMetrics')} className="text-xs text-[#B8422E] underline font-bold uppercase tracking-wider cursor-pointer">Restore Widget</button>
          </div>
        )}

        {/* ==========================================
            COLUMN 2: TODAY FOCUS & INLINE QUICK ADD
           ========================================== */}
        {widgetsVisibility.focusEngine ? (
          <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-6 rounded-sm">
            <div>
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
                Focus Engine
              </span>
              <h3 className="font-display text-2xl font-medium text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
                Today Focus
              </h3>
              
              <div className="mt-4 space-y-3.5 max-h-[200px] overflow-y-auto pr-1">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => {
                    const parentProject = projects.find((p) => p.id === task.project_id);
                    return (
                      <div
                        key={task.id}
                        className="flex items-start space-x-3 p-3 bg-[#F7F5F2] border border-[#6C7278]/20 rounded-sm group transition-all"
                      >
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="text-[#6C7278] hover:text-[#B8422E] shrink-0 mt-0.5"
                        >
                          <Square className="h-4.5 w-4.5" />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-sans text-xs font-semibold text-[#1A1C1E] truncate">
                              {task.name}
                            </span>
                            {task.is_pinned && <Pin className="h-3 w-3 text-[#B8422E] fill-[#B8422E]" />}
                          </div>
                          
                          {task.description && (
                            <p className="font-sans text-xs text-[#6C7278] line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="font-label text-xs bg-white border border-[#6C7278]/30 px-1 py-0.5 uppercase tracking-wide shrink-0">
                              {task.priority}
                            </span>
                            {parentProject && (
                              <Link
                                href={`/projects?projectId=${parentProject.id}`}
                                className="font-label text-xs text-white bg-[#6C7278] hover:bg-[#1A1C1E] transition-colors px-1 py-0.5 uppercase tracking-wide truncate max-w-[120px]"
                              >
                                {parentProject.name}
                              </Link>
                            )}
                            {task.category && (
                              <span className="font-label text-xs text-[#B8422E] bg-[#B8422E]/10 border border-[#B8422E]/25 px-1 py-0.5 uppercase tracking-wide font-bold shrink-0">
                                {task.category}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="font-label text-xs text-[#6C7278] shrink-0">
                                Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => togglePinTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#6C7278] hover:text-[#B8422E] transition-all"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 border border-dashed border-[#6C7278]/30 bg-[#F7F5F2]/40 rounded-sm">
                    <p className="font-sans text-xs text-[#6C7278] italic">All focus items completed.</p>
                    <Link href="/tasks?tab=today" className="font-label text-xs text-[#B8422E] uppercase tracking-wider underline mt-2 block">
                      View Tasks Workspace &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Quick Actions Form */}
            <div className="border-t border-[#6C7278]/20 pt-4 space-y-3">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block font-semibold">
                Quick Action Intake
              </span>
              <form onSubmit={handleQuickActionSubmit} className="space-y-3 font-label text-xs">
                <div className="flex border border-[#6C7278] text-xs rounded-sm overflow-hidden bg-[#F7F5F2]">
                  <button
                    type="button"
                    onClick={() => setQaType('task')}
                    className={`flex-1 py-1 flex items-center justify-center transition-all ${
                      qaType === 'task' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                    }`}
                  >
                    TASK
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaType('inbox')}
                    className={`flex-1 py-1 flex items-center justify-center transition-all border-l border-[#6C7278] ${
                      qaType === 'inbox' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                    }`}
                  >
                    INBOX ITEM
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={qaTitle}
                    onChange={(e) => setQaTitle(e.target.value)}
                    placeholder={qaType === 'task' ? "Task name..." : "Thought / URL capture..."}
                    required
                    className="w-full bg-[#F7F5F2] border border-[#6C7278]/40 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                  
                  {qaType === 'task' && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={qaProjId}
                        onChange={(e) => setQaProjId(e.target.value)}
                        className="bg-white border border-[#6C7278]/40 px-1.5 py-1 focus:outline-none w-full text-xs"
                      >
                        <option value="">Standalone (None)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={qaCategory}
                        onChange={(e) => setQaCategory(e.target.value as Task['category'])}
                        className="bg-white border border-[#6C7278]/40 px-1.5 py-1 focus:outline-none w-full text-xs"
                      >
                        <option value="Work">Work</option>
                        <option value="Personal">Personal</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Learning">Learning</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={qaNotes}
                      onChange={(e) => setQaNotes(e.target.value)}
                      placeholder={qaType === 'task' ? "Description (optional)..." : "Notes / URL detail..."}
                      className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1.5 text-xs focus:outline-none focus:border-[#B8422E] font-sans"
                    />
                    <button type="submit" className="bg-[#1A1C1E] text-white hover:bg-[#B8422E] px-4 py-1.5 uppercase font-bold tracking-wider shrink-0 transition-colors rounded-sm cursor-pointer">
                      ADD
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        ) : (
          <div className="bg-[#F7F5F2]/45 border border-dashed border-[#6C7278]/30 p-6 flex flex-col justify-center items-center text-center rounded-sm min-h-[300px]">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-widest block mb-2">Focus Widget Hidden</span>
            <button onClick={() => toggleWidget('focusEngine')} className="text-xs text-[#B8422E] underline font-bold uppercase tracking-wider cursor-pointer">Restore Widget</button>
          </div>
        )}

        {/* ==========================================
            COLUMN 3: SECTORS & REFLECTIONS
           ========================================== */}
        <div className="space-y-8 flex flex-col justify-between">
          {/* Projects & Academy Progress Widget */}
          {widgetsVisibility.sectorsSkills ? (
            <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-6 rounded-sm flex-1">
              <div>
                <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
                  Sectors & Skills
                </span>
                <h3 className="font-display text-2xl font-medium text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
                  Projects & Learning
                </h3>

                {/* Projects list */}
                <div className="mt-4 space-y-4">
                  <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block">
                    Active Projects
                  </span>
                  
                  {projects.slice(0, 3).map((proj) => {
                    const projTasks = tasks.filter((t) => t.project_id === proj.id);
                    const progress = getWeightedProgress(projTasks);
                    return (
                      <div key={proj.id} className="border-b border-[#6C7278]/10 pb-3">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-sans text-xs font-semibold text-[#1A1C1E] truncate hover:text-[#B8422E]">
                            <Link href={`/projects?projectId=${proj.id}`}>{proj.name}</Link>
                          </span>
                          <span className="font-label text-xs font-bold text-[#B8422E]">{progress}%</span>
                        </div>
                        <div className="w-full bg-[#6C7278]/10 h-1.5 rounded-none overflow-hidden">
                          <div
                            className="bg-[#1A1C1E] h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Academy Course Progress */}
                <div className="mt-6 space-y-4">
                  <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block">
                    Learning Progress
                  </span>

                  {courses.slice(0, 2).map((course) => {
                    const courseLessons = lessons.filter(l => {
                      const m = l.module_id;
                      const matchedMod = courseModules.find(cm => cm.id === m);
                      return matchedMod && matchedMod.course_id === course.id;
                    });
                    const progress = courseLessons.length > 0
                      ? Math.round((courseLessons.filter(l => l.completed).length / courseLessons.length) * 100)
                      : 0;

                    return (
                      <div key={course.id} className="border-b border-[#6C7278]/10 pb-3">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-sans text-xs font-semibold text-[#1A1C1E] truncate hover:text-[#B8422E]">
                            <Link href={`/academy?courseId=${course.id}`}>{course.title}</Link>
                          </span>
                          <span className="font-label text-xs font-bold text-[#B8422E]">{progress}%</span>
                        </div>
                        <div className="w-full bg-[#6C7278]/10 h-1.5 rounded-none overflow-hidden">
                          <div
                            className="bg-[#1A1C1E] h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/habits"
                  className="w-full flex items-center justify-between border border-[#1A1C1E] hover:bg-[#1A1C1E] hover:text-white transition-all py-2.5 px-4 font-label text-xs tracking-wider uppercase"
                >
                  <span>Track Habits & Health</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : (
            <div className="bg-[#F7F5F2]/45 border border-dashed border-[#6C7278]/30 p-6 flex flex-col justify-center items-center text-center rounded-sm min-h-[200px] flex-1">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-widest block mb-2">Sectors Widget Hidden</span>
              <button onClick={() => toggleWidget('sectorsSkills')} className="text-xs text-[#B8422E] underline font-bold uppercase tracking-wider cursor-pointer">Restore Widget</button>
            </div>
          )}

          {/* Daily Reflections / Journal Prompt Widget */}
          {widgetsVisibility.dailyReflections ? (
            <section className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block">
                Daily Reflections
              </span>

              {todayJournal ? (
                <div className="space-y-3 bg-[#F7F5F2]/45 border border-[#6C7278]/15 p-3 rounded-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label text-xs text-emerald-700 font-bold uppercase tracking-wide">✓ Completed Today</span>
                    <Link href="/journal" className="font-label text-xs text-[#B8422E] hover:underline uppercase font-bold tracking-wider">Full Log</Link>
                  </div>
                  <p className="font-sans text-xs text-[#2C2D30] italic line-clamp-3 leading-relaxed">
                    {todayJournal.free_text || 'Morning intentions or reflections logged without diary notes.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleQuickReflectionSubmit} className="space-y-3 font-label text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans text-xs text-[#6C7278] italic">No reflections logged today.</span>
                    <Link href="/journal" className="font-label text-xs text-[#B8422E] hover:underline uppercase font-bold tracking-wider">Full Editor</Link>
                  </div>
                  <textarea
                    value={quickReflection}
                    onChange={(e) => setQuickReflection(e.target.value)}
                    placeholder="Log a quick daily thought or reflection here..."
                    required
                    rows={3}
                    className="w-full bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoggingReflection || !quickReflection.trim()}
                    className="w-full bg-[#1A1C1E] text-white hover:bg-[#B8422E] py-2 uppercase font-bold tracking-widest text-xs transition-colors disabled:opacity-40 rounded-sm cursor-pointer"
                  >
                    {isLoggingReflection ? 'LOGGING...' : 'LOG REFLECTION'}
                  </button>
                </form>
              )}
            </section>
          ) : (
            <div className="bg-[#F7F5F2]/45 border border-dashed border-[#6C7278]/30 p-6 flex flex-col justify-center items-center text-center rounded-sm min-h-[150px]">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-widest block mb-2">Reflections Widget Hidden</span>
              <button onClick={() => toggleWidget('dailyReflections')} className="text-xs text-[#B8422E] underline font-bold uppercase tracking-wider cursor-pointer">Restore Widget</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
