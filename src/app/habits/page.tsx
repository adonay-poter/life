'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { Trash2, Check, Smile, Moon, Droplet, Archive, X } from 'lucide-react';

export default function HabitsPage() {
  const {
    habits,
    habitRecords,
    dailyLogs,
    addHabit,
    deleteHabit,
    archiveHabit,
    recordHabitValue,
    updateDailyLog
  } = useDashboard();

  const { showToast } = useToast();

  // Delete confirmation states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);

  // Month navigation
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form States
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<'binary' | 'numeric'>('binary');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  const [newHabitGoal, setNewHabitGoal] = useState<number>(1);
  const [newHabitCategory, setNewHabitCategory] = useState<string>('Other');
  const [newHabitFrequency, setNewHabitFrequency] = useState<string>('daily');

  // Filter States
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);

  // Streak calculator
  const getHabitStreak = (habitId: string) => {
    let streak = 0;
    let index = 0;
    const habitObj = habits.find(h => h.id === habitId);
    if (!habitObj) return 0;
    
    while (true) {
      const d = new Date();
      d.setDate(d.getDate() - index);
      const dateStr = getLocalDateString(d);
      
      const record = habitRecords.find(r => r.habit_id === habitId && r.date === dateStr);
      if (record) {
        const isCompleted = habitObj.type === 'binary' 
          ? record.value > 0 
          : record.value >= habitObj.goal;
          
        if (isCompleted) {
          streak++;
        } else {
          if (index === 0) {
            index++;
            continue;
          }
          break;
        }
      } else {
        if (index === 0) {
          index++;
          continue;
        }
        break;
      }
      index++;
      if (index > 365) break;
    }
    return streak;
  };

  // Get date strings for the current month
  const getDaysInCurrentMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayName = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase();
      return { day, dateStr, dayName };
    });
  };

  const currentMonthDays = getDaysInCurrentMonth();

  // ==========================================
  // HABIT CREATION HANDLER
  // ==========================================
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) {
      showToast('Habit name cannot be empty.', 'error');
      return;
    }
    await addHabit(newHabitName, newHabitType, newHabitUnit || undefined, newHabitGoal, newHabitCategory, newHabitFrequency);
    showToast('New habit created successfully.', 'success');
    setNewHabitName('');
    setNewHabitUnit('');
    setNewHabitGoal(1);
    setNewHabitCategory('Other');
    setNewHabitFrequency('daily');
    setShowAddHabitModal(false);
  };

  // ==========================================
  // 180-DAY CONSISTENCY HEATMAP GENERATOR
  // ==========================================
  const getHeatmapData = () => {
    const data = [];
    
    for (let i = 179; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      // Calculate completion score on this date
      const totalHabits = habits.length;
      let completedHabits = 0;

      if (totalHabits > 0) {
        habits.forEach((h) => {
          const rec = habitRecords.find((r) => r.habit_id === h.id && r.date === dateStr);
          if (rec) {
            if (h.type === 'binary' && rec.value > 0) completedHabits += 1;
            else if (h.type === 'numeric' && rec.value >= h.goal) completedHabits += 1;
          }
        });
      }

      const ratio = totalHabits > 0 ? completedHabits / totalHabits : 0;
      let level = 0;
      if (ratio > 0 && ratio <= 0.25) level = 1;
      else if (ratio > 0.25 && ratio <= 0.5) level = 2;
      else if (ratio > 0.5 && ratio <= 0.75) level = 3;
      else if (ratio > 0.75) level = 4;

      data.push({
        date: dateStr,
        completed: completedHabits,
        total: totalHabits,
        level,
        weekday: d.getDay() // Sunday = 0, Monday = 1
      });
    }

    return data;
  };

  const heatmapDays = getHeatmapData();

  // Group heatmap days into columns representing weeks (7 days each)
  const columns: typeof heatmapDays[] = [];
  let tempCol: typeof heatmapDays = [];
  
  // Pad the first week if necessary to align weekday rows (0 to 6)
  const firstDayOfWeek = heatmapDays[0].weekday;
  for (let i = 0; i < firstDayOfWeek; i++) {
    tempCol.push({ date: '', completed: 0, total: 0, level: -1, weekday: i });
  }

  heatmapDays.forEach((day) => {
    tempCol.push(day);
    if (tempCol.length === 7) {
      columns.push(tempCol);
      tempCol = [];
    }
  });

  if (tempCol.length > 0) {
    while (tempCol.length < 7) {
      tempCol.push({ date: '', completed: 0, total: 0, level: -1, weekday: tempCol.length });
    }
    columns.push(tempCol);
  }

  // Helper for colors
  const getHeatmapColor = (level: number) => {
    switch (level) {
      case -1: return 'bg-transparent'; // padding
      case 0: return 'bg-border/30'; // zero completed
      case 1: return 'bg-accent/15'; // level 1: 1-25%
      case 2: return 'bg-accent/35'; // level 2: 26-50%
      case 3: return 'bg-accent/65'; // level 3: 51-75%
      case 4: return 'bg-accent'; // level 4: 76-100%
      default: return 'bg-border/30';
    }
  };

  // Matrix cell handlers
  const handleCheckboxToggle = (habitId: string, dateStr: string, currentVal: number) => {
    const nextVal = currentVal > 0 ? 0 : 1;
    if (nextVal > 0) {
      setAnimatingCell(`${habitId}-${dateStr}`);
      setTimeout(() => setAnimatingCell(null), 250);
      showToast('Habit recorded ✓', 'success');
    }
    recordHabitValue(habitId, dateStr, nextVal);
  };

  const handleNumericChange = (habitId: string, dateStr: string, valStr: string) => {
    const numeric = parseFloat(valStr) || 0;
    const habitObj = habits.find(h => h.id === habitId);
    if (habitObj && numeric >= habitObj.goal) {
      setAnimatingCell(`${habitId}-${dateStr}`);
      setTimeout(() => setAnimatingCell(null), 250);
    }
    recordHabitValue(habitId, dateStr, numeric);
  };

  const handleMoodClick = (dateStr: string, moodVal: number) => {
    const existingLog = dailyLogs.find((dl) => dl.date === dateStr);
    const sleep = existingLog ? existingLog.sleep_hours : 0;
    const water = existingLog ? existingLog.water_intake : 0;
    updateDailyLog(dateStr, moodVal, sleep, water);
    showToast('Wellness log saved.', 'success');
  };

  const handleHealthLogChange = (dateStr: string, field: 'sleep' | 'water', valStr: string) => {
    const numeric = parseFloat(valStr) || 0;
    const existingLog = dailyLogs.find((dl) => dl.date === dateStr);
    const mood = existingLog ? existingLog.mood : 3;
    
    if (field === 'sleep') {
      updateDailyLog(dateStr, mood, numeric, existingLog ? existingLog.water_intake : 0);
    } else {
      updateDailyLog(dateStr, mood, existingLog ? existingLog.sleep_hours : 0, numeric);
    }
  };

  const formattedMonth = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const todayStr = getLocalDateString();

  const filteredHabits = habits.filter((h) => {
    const isArchived = h.is_archived || false;
    if (showArchived !== isArchived) return false;
    if (selectedCategoryFilter === 'All') return true;
    return h.category === selectedCategoryFilter;
  });

  return (
    <PageShell>
      {/* Header */}
      <SectionHeader
        title="THE HABIT ENGINE"
        subtitle="Daily Tracker Matrix • 180-Day Discipline Heatmap"
        action={
          <PrimaryButton onClick={() => setShowAddHabitModal(true)}>
            Add Habit
          </PrimaryButton>
        }
      />

      {/* 180-DAY HEATMAP SECTION */}
      <section className="bg-surface border border-border p-6 rounded-none space-y-4 shadow-none">
        <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block border-b border-border pb-1 mb-2 font-bold">
          Discipline Heatmap (Last 180 Days)
        </span>
        
        <div className="flex flex-col items-start space-y-4">
          <div className="flex space-x-2 overflow-x-auto w-full pb-2">
            {/* Weekday indicator labels */}
            <div className="grid grid-rows-7 gap-1 font-label text-[10px] text-secondary uppercase justify-center pr-2 pt-1 select-none font-bold">
              <div>S</div>
              <div>M</div>
              <div>T</div>
              <div>W</div>
              <div>T</div>
              <div>F</div>
              <div>S</div>
            </div>

            {/* Contribution squares grid */}
            <div className="flex space-x-1">
              {columns.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-rows-7 gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={day.date || `empty-${weekIdx}-${dayIdx}`}
                      className={`h-3 w-3 rounded-none border border-background/20 ${getHeatmapColor(day.level)} transition-colors`}
                      title={day.date ? `${day.date}: ${day.completed}/${day.total} habits checked` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Color Key legend */}
          <div className="flex items-center space-x-2 font-label text-[10px] text-secondary font-bold">
            <span>Less Discipline</span>
            <div className="h-3 w-3 border border-border bg-border/30"></div>
            <div className="h-3 w-3 border border-border bg-accent/15"></div>
            <div className="h-3 w-3 border border-border bg-accent/35"></div>
            <div className="h-3 w-3 border border-border bg-accent/65"></div>
            <div className="h-3 w-3 border border-border bg-accent"></div>
            <span>More Discipline</span>
          </div>
        </div>
      </section>

      {/* MATRIX AND CREATOR */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* DAILY MATRIX TABLE */}
        <section className="xl:col-span-3 bg-surface border border-border p-6 rounded-none space-y-6 shadow-none">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-border pb-2 mb-4 gap-3">
            <h4 className="font-serif text-lg font-bold text-primary tracking-tight">
              {formattedMonth} MATRIX
            </h4>
            
            <div className="flex flex-wrap items-center gap-3 font-label text-xs">
              {/* Category Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-secondary uppercase font-bold text-[10px]">Sector:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-neutral-bg border border-border px-2 py-0.5 focus:outline-none uppercase font-bold text-[10px] rounded-none font-sans"
                >
                  <option value="All">All Sectors</option>
                  <option value="Mind">Mind</option>
                  <option value="Body">Body</option>
                  <option value="Spirit">Spirit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Show Archived Toggle */}
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className={`px-2 py-0.5 border transition-colors cursor-pointer font-bold text-[10px] uppercase rounded-none btn-press ${
                  showArchived ? 'bg-primary text-on-primary border-primary font-bold' : 'border-border text-secondary hover:text-primary hover:bg-neutral-bg/50'
                }`}
              >
                {showArchived ? 'View Active' : 'View Archived'}
              </button>

              <div className="h-4 w-px bg-border hidden sm:block"></div>

              <div className="flex space-x-1 font-bold">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                  className="px-2 py-0.5 border border-border hover:bg-neutral-bg/50 font-bold text-[10px] uppercase rounded-none btn-press cursor-pointer"
                >
                  &larr; PREV
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                  className="px-2 py-0.5 border border-border hover:bg-neutral-bg/50 font-bold text-[10px] uppercase rounded-none btn-press cursor-pointer"
                >
                  NEXT &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* MATRIX HORIZONTAL CONTAINER (Desktop only) */}
          <div className="hidden md:block overflow-x-auto border border-border rounded-none shadow-none">
            <table className="min-w-[800px] w-full border-collapse text-left font-label text-xs">
              <thead className="bg-neutral-bg/60 border-b border-border">
                <tr>
                  <th className="p-3 w-44 border-r border-border font-bold text-secondary uppercase tracking-wider sticky left-0 bg-neutral-bg z-10 font-label">
                    Day / Metric
                  </th>
                  {currentMonthDays.map((day) => (
                    <th key={day.day} className="p-2 text-center border-r border-border/60 min-w-[32px] font-bold">
                      <span className="block text-[10px] text-secondary leading-none">{day.dayName}</span>
                      <span className="block text-xs text-primary mt-0.5">{day.day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* HABIT ROWS */}
                {filteredHabits.map((habit) => (
                  <tr key={habit.id} className="border-b border-border/60 hover:bg-neutral-bg/20">
                    <td className="p-3 border-r border-border font-sans sticky left-0 bg-surface z-10 flex flex-col justify-center group min-h-[55px]">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-primary truncate max-w-[100px]">{habit.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextArchived = !habit.is_archived;
                              await archiveHabit(habit.id, nextArchived);
                              showToast(nextArchived ? 'Habit archived.' : 'Habit unarchived.', 'success');
                            }}
                            className={`hover:text-accent p-0.5 cursor-pointer btn-press ${habit.is_archived ? 'text-accent font-bold' : 'text-secondary'}`}
                            title={habit.is_archived ? 'Unarchive Habit' : 'Archive Habit'}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHabitToDelete({ id: habit.id, name: habit.name });
                              setDeleteModalOpen(true);
                            }}
                            className="text-secondary hover:text-accent p-0.5 cursor-pointer btn-press"
                            title="Delete Habit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-1 font-label text-[9px] text-secondary uppercase font-bold select-none">
                        <span className="bg-neutral-bg/60 border border-border px-1.5 py-0.5 rounded-none">{habit.category || 'Other'}</span>
                        <span>Goal: {habit.frequency || 'daily'} ({habit.goal}{habit.unit || ''})</span>
                      </div>
                    </td>
                    
                    {currentMonthDays.map((day) => {
                      const record = habitRecords.find((r) => r.habit_id === habit.id && r.date === day.dateStr);
                      const val = record ? record.value : 0;
                      
                      return (
                        <td key={day.day} className="p-2 border-r border-border/40 text-center">
                          {habit.type === 'binary' ? (
                            <button
                              onClick={() => handleCheckboxToggle(habit.id, day.dateStr, val)}
                              className={`mx-auto h-5 w-5 border flex items-center justify-center rounded-none transition-all cursor-pointer ${
                                val > 0 ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-transparent border-border hover:bg-neutral-bg/50'
                              } ${animatingCell === `${habit.id}-${day.dateStr}` ? 'animate-pop' : ''}`}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          ) : (
                            <input
                              type="text"
                              value={val || ''}
                              onChange={(e) => handleNumericChange(habit.id, day.dateStr, e.target.value)}
                              onBlur={() => showToast('Value updated.', 'info')}
                              placeholder="-"
                              className="w-10 bg-transparent text-center border-b border-transparent focus:border-accent focus:outline-none font-mono text-xs text-primary font-bold"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* divider */}
                <tr className="bg-border/20 h-2 border-b border-border">
                  <td className="sticky left-0 bg-neutral-bg/30 z-10 border-r border-border"></td>
                  {currentMonthDays.map((d) => (
                    <td key={d.day} className="border-r border-border/40"></td>
                  ))}
                </tr>

                {/* MOOD RATING ROW */}
                <tr className="border-b border-border/60">
                  <td className="p-3 border-r border-border font-sans font-semibold text-primary sticky left-0 bg-surface z-10">
                    <div className="flex items-center space-x-1.5">
                      <Smile className="h-4 w-4 text-accent" />
                      <span>Daily Mood (1-5)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const mood = log ? log.mood : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-border/40 text-center">
                        <select
                          value={mood || ''}
                          onChange={(e) => handleMoodClick(day.dateStr, parseInt(e.target.value) || 3)}
                          className="bg-transparent text-center focus:outline-none cursor-pointer text-xs font-mono text-primary font-bold"
                        >
                          <option value="">-</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>

                {/* SLEEP HOURS ROW */}
                <tr className="border-b border-border/60">
                  <td className="p-3 border-r border-border font-sans font-semibold text-primary sticky left-0 bg-surface z-10">
                    <div className="flex items-center space-x-1.5">
                      <Moon className="h-4 w-4 text-secondary" />
                      <span>Sleep (Hours)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const hours = log ? log.sleep_hours : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-border/40 text-center">
                        <input
                          type="text"
                          value={hours || ''}
                          onChange={(e) => handleHealthLogChange(day.dateStr, 'sleep', e.target.value)}
                          onBlur={() => showToast('Wellness log saved.', 'success')}
                          placeholder="-"
                          className="w-10 bg-transparent text-center border-b border-transparent focus:border-accent focus:outline-none font-mono text-xs text-primary font-bold"
                        />
                      </td>
                    );
                  })}
                </tr>

                {/* WATER INTAKE ROW */}
                <tr className="border-b border-border">
                  <td className="p-3 border-r border-border font-sans font-semibold text-primary sticky left-0 bg-surface z-10">
                    <div className="flex items-center space-x-1.5">
                      <Droplet className="h-4 w-4 text-accent" />
                      <span>Water (Liters)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const water = log ? log.water_intake : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-border/40 text-center">
                        <input
                          type="text"
                          value={water || ''}
                          onChange={(e) => handleHealthLogChange(day.dateStr, 'water', e.target.value)}
                          onBlur={() => showToast('Wellness log saved.', 'success')}
                          placeholder="-"
                          className="w-10 bg-transparent text-center border-b border-transparent focus:border-accent focus:outline-none font-mono text-xs text-primary font-bold"
                        />
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          </div>

          {/* MOBILE FRIENDLY DAILY LIST */}
          <div className="block md:hidden space-y-4">
            <div className="flex justify-between items-center bg-neutral-bg/60 border border-border p-4 rounded-none font-label text-xs">
              <span className="font-bold text-secondary uppercase">Today Focus Matrix</span>
              <span className="text-accent font-bold">{todayStr}</span>
            </div>
            
            <div className="space-y-3">
              {filteredHabits.length > 0 ? (
                filteredHabits.map((habit) => {
                  const record = habitRecords.find((r) => r.habit_id === habit.id && r.date === todayStr);
                  const val = record ? record.value : 0;
                  const isDone = habit.type === 'binary' ? val > 0 : val >= habit.goal;
                  const streak = getHabitStreak(habit.id);
                  
                  return (
                    <div 
                      key={habit.id}
                      className="bg-surface border border-secondary/25 p-4 rounded-sm flex items-center justify-between shadow-sm transition-all hover:border-primary"
                    >
                      <div className="space-y-1 min-w-0 flex-1 mr-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-sans text-sm font-bold text-primary truncate">{habit.name}</span>
                          <span className="font-label text-[9px] bg-secondary/10 text-secondary px-1 rounded-[2px] font-bold uppercase shrink-0">
                            {habit.category || 'Other'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 font-label text-[10px] text-secondary font-bold">
                          <span>Goal: {habit.frequency || 'daily'} ({habit.goal}{habit.unit || ''})</span>
                          {streak > 0 && (
                            <span className="text-tertiary flex items-center">
                              🔥 {streak} {streak === 1 ? 'day' : 'days'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center space-x-2">
                        {habit.type === 'binary' ? (
                          <button
                            onClick={() => handleCheckboxToggle(habit.id, todayStr, val)}
                            className={`h-10 w-10 border border-secondary flex items-center justify-center transition-all cursor-pointer ${
                              isDone ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-transparent hover:bg-neutral-bg'
                            } ${animatingCell === `${habit.id}-${todayStr}` ? 'animate-pop' : ''}`}
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1 font-sans">
                            <button
                              onClick={() => recordHabitValue(habit.id, todayStr, Math.max(0, val - 1))}
                              className="h-8 w-8 border border-secondary/30 flex items-center justify-center text-xs font-bold hover:bg-neutral-bg cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-10 text-center font-bold text-sm text-primary">{val}</span>
                            <button
                              onClick={() => {
                                const nextVal = val + 1;
                                if (nextVal >= habit.goal && val < habit.goal) {
                                  setAnimatingCell(`${habit.id}-${todayStr}`);
                                  setTimeout(() => setAnimatingCell(null), 250);
                                  showToast(`Goal met for "${habit.name}"!`, 'success');
                                }
                                recordHabitValue(habit.id, todayStr, nextVal);
                              }}
                              className={`h-8 w-8 border border-secondary/30 flex items-center justify-center text-xs font-bold hover:bg-neutral-bg cursor-pointer ${
                                isDone ? 'bg-primary text-on-primary border-primary' : ''
                              }`}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-surface border border-border py-10 text-center rounded-none shadow-none">
                  <p className="font-sans text-xs text-secondary italic">No active habits in this category.</p>
                </div>
              )}
            </div>
          </div>

        </section>

      </div>

      {/* Habit Configurator Modal */}
      {showAddHabitModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddHabitModal(false);
            }
          }}
          className="fixed inset-0 bg-primary/25 backdrop-blur-[2px] z-[9990] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-surface border border-border p-6 max-w-sm w-full space-y-4 shadow-none rounded-none font-label text-xs">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <span className="font-bold uppercase text-primary text-sm tracking-wide">Configure New Habit</span>
              <button 
                onClick={() => setShowAddHabitModal(false)} 
                className="text-secondary hover:text-accent cursor-pointer p-0.5 btn-press"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateHabit} className="space-y-4 font-label">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary font-bold">Habit Name *</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. Workout (30 mins)"
                  required
                  className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-secondary font-bold">Sector (Category)</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none rounded-none"
                  >
                    <option value="Mind">Mind</option>
                    <option value="Body">Body</option>
                    <option value="Spirit">Spirit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-secondary font-bold">Frequency Goal</label>
                  <select
                    value={newHabitFrequency}
                    onChange={(e) => setNewHabitFrequency(e.target.value)}
                    className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none rounded-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="3x/week">3x/Week</option>
                    <option value="5x/week">5x/Week</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary font-bold">Tracker Type</label>
                <select
                  value={newHabitType}
                  onChange={(e) => setNewHabitType(e.target.value as 'binary' | 'numeric')}
                  className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none rounded-none"
                >
                  <option value="binary">Binary Checked (Yes/No)</option>
                  <option value="numeric">Numeric Metric (Volume)</option>
                </select>
              </div>

              {newHabitType === 'numeric' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Unit</label>
                    <input
                      type="text"
                      value={newHabitUnit}
                      onChange={(e) => setNewHabitUnit(e.target.value)}
                      placeholder="e.g. glass, km, page"
                      className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-sans rounded-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Goal</label>
                    <input
                      type="number"
                      step="any"
                      value={newHabitGoal}
                      onChange={(e) => setNewHabitGoal(parseFloat(e.target.value) || 1)}
                      className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-sans rounded-none"
                    />
                  </div>
                </div>
              )}

              <PrimaryButton type="submit" className="w-full mt-2">
                SAVE NEW HABIT
              </PrimaryButton>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setHabitToDelete(null);
        }}
        onConfirm={async () => {
          if (habitToDelete) {
            await deleteHabit(habitToDelete.id);
            showToast('Habit deleted successfully.', 'info');
          }
        }}
        itemName={habitToDelete?.name || ''}
        itemType="habit"
      />
    </PageShell>
  );
}
