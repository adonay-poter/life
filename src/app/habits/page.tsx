'use client';

import React, { useState } from 'react';
import { useDashboard, getLocalDateString } from '@/context/DashboardContext';
import { Trash2, Check, Smile, Moon, Droplet } from 'lucide-react';

export default function HabitsPage() {
  const {
    habits,
    habitRecords,
    dailyLogs,
    addHabit,
    deleteHabit,
    recordHabitValue,
    updateDailyLog
  } = useDashboard();

  // Month navigation
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form States
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<'binary' | 'numeric'>('binary');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  const [newHabitGoal, setNewHabitGoal] = useState<number>(1);

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
  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit(newHabitName, newHabitType, newHabitUnit || undefined, newHabitGoal);
    setNewHabitName('');
    setNewHabitUnit('');
    setNewHabitGoal(1);
  };

  // ==========================================
  // 90-DAY CONSISTENCY HEATMAP GENERATOR
  // ==========================================
  const getHeatmapData = () => {
    const data = [];
    
    for (let i = 89; i >= 0; i--) {
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
      case 0: return 'bg-[#EAE8E4]'; // zero completed
      case 1: return 'bg-[#D8E2D9]'; // level 1: 1-25%
      case 2: return 'bg-[#B5C7B7]'; // level 2: 26-50%
      case 3: return 'bg-[#8EAB92]'; // level 3: 51-75%
      case 4: return 'bg-[#58805F]'; // level 4: 76-100%
      default: return 'bg-[#EAE8E4]';
    }
  };

  // Matrix cell handlers
  const handleCheckboxToggle = (habitId: string, dateStr: string, currentVal: number) => {
    const nextVal = currentVal > 0 ? 0 : 1;
    recordHabitValue(habitId, dateStr, nextVal);
  };

  const handleNumericChange = (habitId: string, dateStr: string, valStr: string) => {
    const numeric = parseFloat(valStr) || 0;
    recordHabitValue(habitId, dateStr, numeric);
  };

  const handleMoodClick = (dateStr: string, moodVal: number) => {
    const existingLog = dailyLogs.find((dl) => dl.date === dateStr);
    const sleep = existingLog ? existingLog.sleep_hours : 0;
    const water = existingLog ? existingLog.water_intake : 0;
    updateDailyLog(dateStr, moodVal, sleep, water);
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

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex justify-between items-baseline">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            THE HABIT ENGINE
          </h2>
          <p className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Daily Tracker Matrix &bull; 90-Day Discipline Heatmap
          </p>
        </div>
      </header>

      {/* 90-DAY HEATMAP SECTION */}
      <section className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4">
        <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block border-b border-[#6C7278]/25 pb-1 mb-2">
          Discipline Heatmap (Last 90 Days)
        </span>
        
        <div className="flex flex-col items-center md:items-start space-y-4">
          <div className="flex space-x-2 overflow-x-auto max-w-full pb-2">
            {/* Weekday indicator labels */}
            <div className="grid grid-rows-7 gap-1 font-label text-[8px] text-[#6C7278] uppercase justify-center pr-2 pt-1 select-none">
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
                      className={`h-3 w-3 rounded-none ${getHeatmapColor(day.level)} transition-colors`}
                      title={day.date ? `${day.date}: ${day.completed}/${day.total} habits checked` : undefined}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Color Key legend */}
          <div className="flex items-center space-x-2 font-label text-[9px] text-[#6C7278]">
            <span>Less Discipline</span>
            <div className="h-3 w-3 bg-[#EAE8E4]"></div>
            <div className="h-3 w-3 bg-[#D8E2D9]"></div>
            <div className="h-3 w-3 bg-[#B5C7B7]"></div>
            <div className="h-3 w-3 bg-[#8EAB92]"></div>
            <div className="h-3 w-3 bg-[#58805F]"></div>
            <span>More Discipline</span>
          </div>
        </div>
      </section>

      {/* MATRIX AND CREATOR */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* DAILY MATRIX TABLE */}
        <section className="xl:col-span-3 bg-white border border-[#6C7278] p-6 rounded-sm space-y-6">
          <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2 mb-4">
            <h4 className="font-display text-lg font-bold text-[#1A1C1E] tracking-tight">
              {formattedMonth} MATRIX
            </h4>
            
            <div className="flex space-x-2 font-label text-[10px]">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className="px-2 py-1 border border-[#6C7278] hover:bg-[#F7F5F2]"
              >
                &larr; PREV
              </button>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className="px-2 py-1 border border-[#6C7278] hover:bg-[#F7F5F2]"
              >
                NEXT &rarr;
              </button>
            </div>
          </div>

          {/* MATRIX HORIZONTAL CONTAINER */}
          <div className="overflow-x-auto border border-[#6C7278]/40 rounded-sm">
            <table className="min-w-[800px] w-full border-collapse text-left font-label text-xs">
              <thead className="bg-[#F7F5F2] border-b border-[#6C7278]">
                <tr>
                  <th className="p-3 w-36 border-r border-[#6C7278] font-bold text-[#1A1C1E] uppercase tracking-wider sticky left-0 bg-[#F7F5F2] z-10">
                    Day / Metric
                  </th>
                  {currentMonthDays.map((day) => (
                    <th key={day.day} className="p-2 text-center border-r border-[#6C7278]/40 min-w-[32px]">
                      <span className="block text-[8px] text-[#6C7278] font-medium leading-none">{day.dayName}</span>
                      <span className="block text-[11px] text-[#1A1C1E] font-bold mt-0.5">{day.day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* HABIT ROWS */}
                {habits.map((habit) => (
                  <tr key={habit.id} className="border-b border-[#6C7278]/30 hover:bg-[#F7F5F2]/20">
                    <td className="p-3 border-r border-[#6C7278] font-sans font-semibold text-[#1A1C1E] sticky left-0 bg-white z-10 flex justify-between items-center group">
                      <span className="truncate max-w-[100px]">{habit.name}</span>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#6C7278] hover:text-[#B8422E] p-0.5"
                        title="Delete habit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    
                    {currentMonthDays.map((day) => {
                      const record = habitRecords.find((r) => r.habit_id === habit.id && r.date === day.dateStr);
                      const val = record ? record.value : 0;
                      
                      return (
                        <td key={day.day} className="p-2 border-r border-[#6C7278]/25 text-center">
                          {habit.type === 'binary' ? (
                            <button
                              onClick={() => handleCheckboxToggle(habit.id, day.dateStr, val)}
                              className={`mx-auto h-5 w-5 border border-[#6C7278] flex items-center justify-center rounded-none transition-all ${
                                val > 0 ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-transparent text-transparent hover:bg-[#F7F5F2]'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          ) : (
                            <input
                              type="text"
                              value={val || ''}
                              onChange={(e) => handleNumericChange(habit.id, day.dateStr, e.target.value)}
                              placeholder="-"
                              className="w-10 bg-transparent text-center border-b border-transparent focus:border-[#B8422E] focus:outline-none font-sans text-xs text-[#1A1C1E]"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* divider */}
                <tr className="bg-[#6C7278]/20 h-2 border-b border-[#6C7278]">
                  <td className="sticky left-0 bg-[#6C7278]/10 z-10"></td>
                  {currentMonthDays.map((d) => (
                    <td key={d.day}></td>
                  ))}
                </tr>

                {/* MOOD RATING ROW */}
                <tr className="border-b border-[#6C7278]/30">
                  <td className="p-3 border-r border-[#6C7278] font-sans font-semibold text-[#1A1C1E] sticky left-0 bg-white z-10">
                    <div className="flex items-center space-x-1.5">
                      <Smile className="h-4 w-4 text-[#B8422E]" />
                      <span>Daily Mood (1-5)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const mood = log ? log.mood : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-[#6C7278]/25 text-center">
                        <select
                          value={mood || ''}
                          onChange={(e) => handleMoodClick(day.dateStr, parseInt(e.target.value) || 3)}
                          className="bg-transparent text-center focus:outline-none cursor-pointer text-xs font-sans text-[#1A1C1E]"
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
                <tr className="border-b border-[#6C7278]/30">
                  <td className="p-3 border-r border-[#6C7278] font-sans font-semibold text-[#1A1C1E] sticky left-0 bg-white z-10">
                    <div className="flex items-center space-x-1.5">
                      <Moon className="h-4 w-4 text-[#6C7278]" />
                      <span>Sleep (Hours)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const hours = log ? log.sleep_hours : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-[#6C7278]/25 text-center">
                        <input
                          type="text"
                          value={hours || ''}
                          onChange={(e) => handleHealthLogChange(day.dateStr, 'sleep', e.target.value)}
                          placeholder="-"
                          className="w-10 bg-transparent text-center border-b border-transparent focus:border-[#B8422E] focus:outline-none font-sans text-xs text-[#1A1C1E]"
                        />
                      </td>
                    );
                  })}
                </tr>

                {/* WATER INTAKE ROW */}
                <tr className="border-b border-[#6C7278]">
                  <td className="p-3 border-r border-[#6C7278] font-sans font-semibold text-[#1A1C1E] sticky left-0 bg-white z-10">
                    <div className="flex items-center space-x-1.5">
                      <Droplet className="h-4 w-4 text-[#B8422E]" />
                      <span>Water (Liters)</span>
                    </div>
                  </td>
                  {currentMonthDays.map((day) => {
                    const log = dailyLogs.find((dl) => dl.date === day.dateStr);
                    const water = log ? log.water_intake : 0;
                    return (
                      <td key={day.day} className="p-2 border-r border-[#6C7278]/25 text-center">
                        <input
                          type="text"
                          value={water || ''}
                          onChange={(e) => handleHealthLogChange(day.dateStr, 'water', e.target.value)}
                          placeholder="-"
                          className="w-10 bg-transparent text-center border-b border-transparent focus:border-[#B8422E] focus:outline-none font-sans text-xs text-[#1A1C1E]"
                        />
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          </div>
        </section>

        {/* HABIT CREATOR DRAWER */}
        <section className="bg-white border border-[#6C7278] p-6 rounded-sm self-start">
          <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-4 border-b border-[#6C7278]/25 pb-1">
            Habit Configurator
          </span>

          <form onSubmit={handleCreateHabit} className="space-y-4 font-label text-xs">
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Habit Name *</label>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g. Read 15 pages"
                required
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-1.5 focus:outline-none font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Tracker Type</label>
              <select
                value={newHabitType}
                onChange={(e) => setNewHabitType(e.target.value as 'binary' | 'numeric')}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="binary">Binary Checked (Yes/No)</option>
                <option value="numeric">Numeric Metric (Volume)</option>
              </select>
            </div>

            {newHabitType === 'numeric' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase text-[#6C7278]">Measurement Unit</label>
                  <input
                    type="text"
                    value={newHabitUnit}
                    onChange={(e) => setNewHabitUnit(e.target.value)}
                    placeholder="e.g. glass, km, page"
                    className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-1.5 focus:outline-none font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase text-[#6C7278]">Daily Volume Goal</label>
                  <input
                    type="number"
                    step="any"
                    value={newHabitGoal}
                    onChange={(e) => setNewHabitGoal(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-1.5 focus:outline-none font-sans"
                  />
                </div>
              </>
            )}

            {/* Terracotta Action Button */}
            <button type="submit" className="w-full btn-tertiary uppercase text-[10px] tracking-wider font-bold mt-2">
              SAVE NEW HABIT
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
