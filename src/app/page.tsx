'use client';

import React from 'react';
import { useDashboard, Task, getLocalDateString } from '@/context/DashboardContext';
import { Square, Pin, PinOff, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const {
    tasks,
    projects,
    courses,
    lessons,
    habits,
    habitRecords,
    courseModules,
    updateTaskStatus,
    togglePinTask
  } = useDashboard();

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
  const todayStr = getLocalDateString();
  
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
      
      // Count tasks done on this specific due_date
      const doneOnDay = tasks.filter((t) => {
        return t.status === 'done' && t.due_date && getLocalDateString(new Date(t.due_date)) === dateString;
      });

      // Sum weights or just count task count
      const taskCount = doneOnDay.length;
      days.push({ label: dayLabel, count: taskCount, dateStr: dateString });
    }

    const counts = days.map(d => d.count);
    const maxCount = Math.max(...counts, 1); // Avoid division by zero
    
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
      {/* Broadsheet Style Top Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col md:flex-row justify-between items-baseline gap-2">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            THE DAILY MONITOR
          </h2>
          <p className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Architecture of Self &mdash; Vol. CLXIX &bull; No. 1
          </p>
        </div>
        <div className="font-label text-xs text-[#1A1C1E] font-medium tracking-wider">
          {formattedDate}
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1: THE MACRO METRIC
           ========================================== */}
        <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-8 rounded-sm">
          <div>
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
              Composite Integrity
            </span>
            <h3 className="font-display text-6xl font-bold text-[#1A1C1E] tracking-tight">
              {lifeScore}%
            </h3>
            <p className="font-sans text-xs text-[#6C7278] mt-3 leading-relaxed">
              Calculated dynamically. Weighted task throughput carries 40% value, daily habit consistency 30%, and learning progress 30%.
            </p>
          </div>

          {/* Sub-Progress Rings */}
          <div className="grid grid-cols-3 gap-3 border-t border-b border-[#6C7278]/20 py-4 font-label">
            <div className="text-center">
              <span className="text-[9px] text-[#6C7278] uppercase tracking-wider block mb-1">Tasks</span>
              <span className="text-sm font-bold text-[#1A1C1E]">{taskProgress}%</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[#6C7278] uppercase tracking-wider block mb-1">Habits</span>
              <span className="text-sm font-bold text-[#1A1C1E]">{habitProgress}%</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[#6C7278] uppercase tracking-wider block mb-1">Academy</span>
              <span className="text-sm font-bold text-[#1A1C1E]">{learningProgress}%</span>
            </div>
          </div>

          {/* 7-Day Completion Bar Chart */}
          <div>
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-4">
              7-Day Task Completion
            </span>
            <div className="h-28 flex items-end justify-between px-2 pt-2 border-b border-[#6C7278]">
              {chartData.map((day) => (
                <div key={day.dateStr} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#1A1C1E] text-white text-[9px] font-label px-1 py-0.5 mb-1 shrink-0">
                    {day.count}
                  </span>
                  <div className="w-4 bg-[#6C7278]/20 h-24 flex items-end">
                    <div
                      className="w-full bg-[#1A1C1E] hover:bg-[#B8422E] transition-colors"
                      style={{ height: `${day.heightPct}%` }}
                    ></div>
                  </div>
                  <span className="font-label text-[9px] text-[#6C7278] mt-2 tracking-tighter">
                    {day.label.slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================
            COLUMN 2: TODAY FOCUS
           ========================================== */}
        <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-6 rounded-sm">
          <div>
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
              Focus Engine
            </span>
            <h3 className="font-display text-2xl font-medium text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
              Today Focus
            </h3>
            
            <div className="mt-4 space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
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
                          <p className="font-sans text-[11px] text-[#6C7278] line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                        
                        {/* Badge / Priority */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="font-label text-[8px] bg-white border border-[#6C7278]/30 px-1 py-0.5 uppercase tracking-wide shrink-0">
                            {task.priority}
                          </span>
                          {parentProject && (
                            <Link
                              href={`/projects?projectId=${parentProject.id}`}
                              className="font-label text-[8px] text-white bg-[#6C7278] hover:bg-[#1A1C1E] transition-colors px-1 py-0.5 uppercase tracking-wide truncate max-w-[120px]"
                            >
                              {parentProject.name}
                            </Link>
                          )}
                          {task.category && (
                            <span className="font-label text-[8px] text-[#B8422E] bg-[#B8422E]/10 border border-[#B8422E]/25 px-1 py-0.5 uppercase tracking-wide font-bold shrink-0">
                              {task.category}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="font-label text-[8px] text-[#6C7278] shrink-0">
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
                  <p className="font-sans text-xs text-[#6C7278] italic">All items for today completed.</p>
                  <Link href="/projects" className="font-label text-[10px] text-[#B8422E] uppercase tracking-wider underline mt-2 block">
                    View Project Board &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#6C7278]/20 pt-4">
            <Link
              href="/inbox"
              className="w-full flex items-center justify-between border border-[#1A1C1E] hover:bg-[#1A1C1E] hover:text-white transition-all py-2.5 px-4 font-label text-xs tracking-wider uppercase"
            >
              <span>Triage Inbox Items</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ==========================================
            COLUMN 3: ACTIVE PROJECTS & ACADEMY
           ========================================== */}
        <section className="bg-white border border-[#6C7278] p-6 flex flex-col justify-between space-y-6 rounded-sm">
          <div>
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-2">
              Sectors & Skills
            </span>
            <h3 className="font-display text-2xl font-medium text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
              Projects & Learning
            </h3>

            {/* Projects list */}
            <div className="mt-4 space-y-4">
              <span className="font-label text-[9px] text-[#6C7278] uppercase tracking-wider block">
                Active Projects
              </span>
              
              {projects.map((proj) => {
                const projTasks = tasks.filter((t) => t.project_id === proj.id);
                const progress = getWeightedProgress(projTasks);
                return (
                  <div key={proj.id} className="border-b border-[#6C7278]/10 pb-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-sans text-xs font-semibold text-[#1A1C1E] truncate hover:text-[#B8422E]">
                        <Link href={`/projects?projectId=${proj.id}`}>{proj.name}</Link>
                      </span>
                      <span className="font-label text-[10px] font-bold text-[#B8422E]">{progress}%</span>
                    </div>
                    {/* Progress Bar */}
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
              <span className="font-label text-[9px] text-[#6C7278] uppercase tracking-wider block">
                Learning Progress
              </span>

              {courses.map((course) => {
                const courseLessons = lessons.filter(l => {
                  const m = l.module_id;
                  // Map lesson module back to check if it matches the course
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
                      <span className="font-label text-[10px] font-bold text-[#B8422E]">{progress}%</span>
                    </div>
                    {/* Progress Bar */}
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
        
      </div>
    </div>
  );
}
