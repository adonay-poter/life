'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';

export interface Habit {
  id: string;
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  goal: number;
  created_at?: string;
  category?: string;
  frequency?: string;
  is_archived?: boolean;
}

export interface HabitRecord {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  created_at?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  sleep_hours: number;
  water_intake: number;
  created_at?: string;
}

interface HabitContextProps {
  habits: Habit[];
  habitRecords: HabitRecord[];
  dailyLogs: DailyLog[];
  loading: boolean;
  addHabit: (name: string, type: 'binary' | 'numeric', unit?: string, goal?: number, category?: string, frequency?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  archiveHabit: (id: string, isArchived: boolean) => Promise<void>;
  recordHabitValue: (habitId: string, date: string, value: number) => Promise<void>;
  updateDailyLog: (date: string, mood: number, sleepHours: number, waterIntake: number) => Promise<void>;
}

const HabitContext = createContext<HabitContextProps | undefined>(undefined);

export const useHabit = () => {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabit must be used within a HabitProvider');
  }
  return context;
};

const MOCK_HABITS: Habit[] = [
  { id: 'h1', name: 'Workout (30 mins)', type: 'binary', goal: 1 },
  { id: 'h2', name: 'Hydration (Liters)', type: 'numeric', unit: 'L', goal: 3 },
  { id: 'h3', name: 'Sleep Hours', type: 'numeric', unit: 'hrs', goal: 8 }
];

// Helper to generate past dates
const getDateString = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const MOCK_HABIT_RECORDS: HabitRecord[] = [
  { id: 'hr1', habit_id: 'h1', date: getDateString(0), value: 1 },
  { id: 'hr2', habit_id: 'h2', date: getDateString(0), value: 3 },
  { id: 'hr3', habit_id: 'h3', date: getDateString(0), value: 7.5 },
  
  { id: 'hr4', habit_id: 'h1', date: getDateString(1), value: 0 },
  { id: 'hr5', habit_id: 'h2', date: getDateString(1), value: 2.5 },
  { id: 'hr6', habit_id: 'h3', date: getDateString(1), value: 8 },

  { id: 'hr7', habit_id: 'h1', date: getDateString(2), value: 1 },
  { id: 'hr8', habit_id: 'h2', date: getDateString(2), value: 3.5 },
  { id: 'hr9', habit_id: 'h3', date: getDateString(2), value: 8.5 }
];

const MOCK_DAILY_LOGS: DailyLog[] = [
  { date: getDateString(0), mood: 4, sleep_hours: 7.5, water_intake: 3 },
  { date: getDateString(1), mood: 3, sleep_hours: 8, water_intake: 2.5 },
  { date: getDateString(2), mood: 5, sleep_hours: 8.5, water_intake: 3.5 }
];

export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resHabits, resRecords, resLogs] = await Promise.all([
          supabase.from('habits').select('*'),
          supabase.from('habit_records').select('*'),
          supabase.from('daily_logs').select('*')
        ]);

        const hasData = resHabits.data && resHabits.data.length > 0;

        if (hasData) {
          setHabits(resHabits.data || []);
          setHabitRecords(resRecords.data || []);
          setDailyLogs(resLogs.data || []);

          localStorage.setItem('heritage_habits', JSON.stringify(resHabits.data || []));
          localStorage.setItem('heritage_habit_records', JSON.stringify(resRecords.data || []));
          localStorage.setItem('heritage_daily_logs', JSON.stringify(resLogs.data || []));
        } else {
          const localHabits = localStorage.getItem('heritage_habits');
          const localRecords = localStorage.getItem('heritage_habit_records');
          const localLogs = localStorage.getItem('heritage_daily_logs');

          setHabits(localHabits ? JSON.parse(localHabits) : MOCK_HABITS);
          setHabitRecords(localRecords ? JSON.parse(localRecords) : MOCK_HABIT_RECORDS);
          setDailyLogs(localLogs ? JSON.parse(localLogs) : MOCK_DAILY_LOGS);

          if (!localHabits && isOnline) {
            await Promise.all([
              supabase.from('habits').upsert(MOCK_HABITS),
              supabase.from('habit_records').upsert(MOCK_HABIT_RECORDS),
              supabase.from('daily_logs').upsert(MOCK_DAILY_LOGS)
            ]);
          }
        }
      } catch (err) {
        console.warn('Recovering habits from cache:', err);
        const localHabits = localStorage.getItem('heritage_habits');
        const localRecords = localStorage.getItem('heritage_habit_records');
        const localLogs = localStorage.getItem('heritage_daily_logs');

        setHabits(localHabits ? JSON.parse(localHabits) : MOCK_HABITS);
        setHabitRecords(localRecords ? JSON.parse(localRecords) : MOCK_HABIT_RECORDS);
        setDailyLogs(localLogs ? JSON.parse(localLogs) : MOCK_DAILY_LOGS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, refreshKey]);

  const addHabit = async (name: string, type: 'binary' | 'numeric', unit?: string, goal: number = 1, category: string = 'Other', frequency: string = 'daily') => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      type,
      unit,
      goal,
      category,
      frequency,
      is_archived: false,
      created_at: new Date().toISOString()
    };

    const updated = [...habits, newHabit];
    setHabits(updated);
    localStorage.setItem('heritage_habits', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('habits').insert(newHabit);
    }
  };

  const deleteHabit = async (id: string) => {
    const updatedH = habits.filter((h) => h.id !== id);
    const updatedRecords = habitRecords.filter((hr) => hr.habit_id !== id);
    setHabits(updatedH);
    setHabitRecords(updatedRecords);
    localStorage.setItem('heritage_habits', JSON.stringify(updatedH));
    localStorage.setItem('heritage_habit_records', JSON.stringify(updatedRecords));

    if (isOnline) {
      await supabase.from('habits').delete().eq('id', id);
    }
  };

  const archiveHabit = async (id: string, isArchived: boolean) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        return { ...h, is_archived: isArchived };
      }
      return h;
    });

    setHabits(updated);
    localStorage.setItem('heritage_habits', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('habits').update({ is_archived: isArchived }).eq('id', id);
    }
  };

  const recordHabitValue = async (habitId: string, date: string, value: number) => {
    const existingIndex = habitRecords.findIndex((hr) => hr.habit_id === habitId && hr.date === date);
    const updated = [...habitRecords];

    const recordId = existingIndex >= 0 ? habitRecords[existingIndex].id : crypto.randomUUID();
    const newRecord: HabitRecord = {
      id: recordId,
      habit_id: habitId,
      date,
      value,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newRecord;
    } else {
      updated.push(newRecord);
    }

    setHabitRecords(updated);
    localStorage.setItem('heritage_habit_records', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('habit_records').upsert(newRecord);
    }
  };

  const updateDailyLog = async (date: string, mood: number, sleepHours: number, waterIntake: number) => {
    const existingIndex = dailyLogs.findIndex((dl) => dl.date === date);
    const updated = [...dailyLogs];

    const newLog: DailyLog = {
      date,
      mood,
      sleep_hours: sleepHours,
      water_intake: waterIntake,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newLog;
    } else {
      updated.push(newLog);
    }

    setDailyLogs(updated);
    localStorage.setItem('heritage_daily_logs', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('daily_logs').upsert(newLog);
    }
  };

  return (
    <HabitContext.Provider
      value={{
        habits,
        habitRecords,
        dailyLogs,
        loading,
        addHabit,
        deleteHabit,
        archiveHabit,
        recordHabitValue,
        updateDailyLog
      }}
    >
      {children}
    </HabitContext.Provider>
  );
};
