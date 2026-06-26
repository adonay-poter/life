'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';
import { useToast } from './ToastContext';

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  morning_intentions: string[]; // Length 3
  evening_reflections_learned: string[]; // Length 3
  evening_reflections_better: string[]; // Length 3
  free_text?: string;
  created_at?: string;
}

interface JournalContextProps {
  journalEntries: JournalEntry[];
  loading: boolean;
  updateJournalEntry: (
    date: string,
    morningIntentions: string[],
    eveningReflectionsLearned: string[],
    eveningReflectionsBetter: string[],
    freeText?: string
  ) => Promise<void>;
  deleteJournalEntry?: (date: string) => Promise<void>; // Add delete capability requested by user!
}

const JournalContext = createContext<JournalContextProps | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

// Helper to generate past dates
const getDateString = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    date: getDateString(0),
    morning_intentions: ['Submit all database schema scripts', 'Complete long interval running session', 'Read 2 chapters of architectural book'],
    evening_reflections_learned: ['Interval threshold runs require heavy warmups', 'PWA manifests require clean icon size mappings', 'Supabase handles public cascades correctly'],
    evening_reflections_better: ['Begin the long run earlier in the morning', 'Break down SQL operations into single table runs', 'Avoid working past 10 PM'],
    free_text: 'Had an extremely productive day. The Heritage layout is starting to feel very solid. Limestone background is pleasant on the eyes.'
  }
];

export const JournalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('journal_entries').select('*');

        if (!error && data && data.length > 0) {
          setJournalEntries(data);
          localStorage.setItem('heritage_journal', JSON.stringify(data));
        } else {
          const local = localStorage.getItem('heritage_journal');
          setJournalEntries(local ? JSON.parse(local) : MOCK_JOURNAL_ENTRIES);

          if (!local && isOnline) {
            const { error } = await supabase.from('journal_entries').upsert(MOCK_JOURNAL_ENTRIES);
        if (error) throw error;
          }
        }
      } catch (err) {
        console.warn('Recovering journal from cache:', err);
        const local = localStorage.getItem('heritage_journal');
        setJournalEntries(local ? JSON.parse(local) : MOCK_JOURNAL_ENTRIES);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, refreshKey]);

  const updateJournalEntry = async (
    date: string,
    morningIntentions: string[],
    eveningReflectionsLearned: string[],
    eveningReflectionsBetter: string[],
    freeText?: string
  ) => {
    const existingIndex = journalEntries.findIndex((j) => j.date === date);
    const updated = [...journalEntries];

    const newEntry: JournalEntry = {
      date,
      morning_intentions: morningIntentions,
      evening_reflections_learned: eveningReflectionsLearned,
      evening_reflections_better: eveningReflectionsBetter,
      free_text: freeText,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newEntry;
    } else {
      updated.push(newEntry);
    }

    setJournalEntries(updated);
    localStorage.setItem('heritage_journal', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('journal_entries').upsert(newEntry);
        if (error) throw error;
    }
  };

  const deleteJournalEntry = async (date: string) => {
    const updated = journalEntries.filter((j) => j.date !== date);
    setJournalEntries(updated);
    localStorage.setItem('heritage_journal', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('journal_entries').delete().eq('date', date);
        if (error) throw error;
    }
  };

  return (
    <JournalContext.Provider
      value={{
        journalEntries,
        loading,
        updateJournalEntry,
        deleteJournalEntry
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};
