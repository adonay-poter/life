'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import Checkbox from '@/components/ui/Checkbox';
import EmptyState from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Inputs';
import { Search, Calendar, ChevronRight, Activity, Moon, Droplet, CheckCircle } from 'lucide-react';

export default function JournalPage() {
  const {
    journalEntries,
    updateJournalEntry,
    habits,
    habitRecords,
    dailyLogs,
    recordHabitValue,
    updateDailyLog,
    tasks,
    loading
  } = useDashboard();
  const { showToast } = useToast();

  // Selected date to edit (YYYY-MM-DD)
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());

  // Editor Inputs
  const [mIntention1, setMIntention1] = useState('');
  const [mIntention2, setMIntention2] = useState('');
  const [mIntention3, setMIntention3] = useState('');

  const [eLearned1, setELearned1] = useState('');
  const [eLearned2, setELearned2] = useState('');
  const [eLearned3, setELearned3] = useState('');

  const [eBetter1, setEBetter1] = useState('');
  const [eBetter2, setEBetter2] = useState('');
  const [eBetter3, setEBetter3] = useState('');

  const [freeText, setFreeText] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'editor' | 'metrics' | 'timeline'>('editor');

  // Metrics states
  const [mood, setMood] = useState(3);
  const [sleepHours, setSleepHours] = useState(8);
  const [waterIntake, setWaterIntake] = useState(2);

  // Auto-save and dirty tracking states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [hasAutoSaved, setHasAutoSaved] = useState(false);

  const prevDateRef = useRef(selectedDateStr);
  const saveStatusRef = useRef(saveStatus);
  const updateJournalEntryRef = useRef(updateJournalEntry);
  const formValuesRef = useRef({
    mIntention1,
    mIntention2,
    mIntention3,
    eLearned1,
    eLearned2,
    eLearned3,
    eBetter1,
    eBetter2,
    eBetter3,
    freeText,
  });

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    updateJournalEntryRef.current = updateJournalEntry;
  }, [updateJournalEntry]);

  // Keep formValuesRef synced
  useEffect(() => {
    formValuesRef.current = {
      mIntention1,
      mIntention2,
      mIntention3,
      eLearned1,
      eLearned2,
      eLearned3,
      eBetter1,
      eBetter2,
      eBetter3,
      freeText,
    };
  }, [
    mIntention1,
    mIntention2,
    mIntention3,
    eLearned1,
    eLearned2,
    eLearned3,
    eBetter1,
    eBetter2,
    eBetter3,
    freeText,
  ]);

  // Helper to save a specific date entry
  const saveEntryForDate = useCallback((dateStr: string, values: typeof formValuesRef.current) => {
    const morning = [values.mIntention1, values.mIntention2, values.mIntention3].filter((s) => s.trim().length > 0);
    const learned = [values.eLearned1, values.eLearned2, values.eLearned3].filter((s) => s.trim().length > 0);
    const better = [values.eBetter1, values.eBetter2, values.eBetter3].filter((s) => s.trim().length > 0);
    updateJournalEntryRef.current(dateStr, morning, learned, better, values.freeText);
  }, []);

  // Load data and handle date transition saving
  useEffect(() => {
    const prevDate = prevDateRef.current;
    const currentSaveStatus = saveStatusRef.current;
    
    // 1. If switching dates and form is dirty, flush previous date's changes
    if (prevDate && prevDate !== selectedDateStr && currentSaveStatus === 'dirty') {
      saveEntryForDate(prevDate, formValuesRef.current);
    }

    // 2. Load the entry for the selected date
    const entry = journalEntries.find((j) => j.date === selectedDateStr);
    const dateChanged = prevDate !== selectedDateStr;

    if (dateChanged || currentSaveStatus === 'saved') {
      if (dateChanged) setHasAutoSaved(false);
      if (entry) {
        setMIntention1(entry.morning_intentions[0] || '');
        setMIntention2(entry.morning_intentions[1] || '');
        setMIntention3(entry.morning_intentions[2] || '');

        setELearned1(entry.evening_reflections_learned[0] || '');
        setELearned2(entry.evening_reflections_learned[1] || '');
        setELearned3(entry.evening_reflections_learned[2] || '');

        setEBetter1(entry.evening_reflections_better[0] || '');
        setEBetter2(entry.evening_reflections_better[1] || '');
        setEBetter3(entry.evening_reflections_better[2] || '');

        setFreeText(entry.free_text || '');
      } else {
        setMIntention1('');
        setMIntention2('');
        setMIntention3('');
        setELearned1('');
        setELearned2('');
        setELearned3('');
        setEBetter1('');
        setEBetter2('');
        setEBetter3('');
        setFreeText('');
      }
      setSaveStatus('saved');
    }

    prevDateRef.current = selectedDateStr;
  }, [selectedDateStr, journalEntries, saveEntryForDate]);

  // Load metrics for the selected date
  useEffect(() => {
    const entryLog = dailyLogs.find((dl) => dl.date === selectedDateStr);
    if (entryLog) {
      setMood(entryLog.mood || 3);
      setSleepHours(entryLog.sleep_hours || 8);
      setWaterIntake(entryLog.water_intake || 2);
    } else {
      setMood(3);
      setSleepHours(8);
      setWaterIntake(2);
    }
  }, [selectedDateStr, dailyLogs]);

  const handleMetricChange = async (newMood: number, newSleep: number, newWater: number) => {
    setMood(newMood);
    setSleepHours(newSleep);
    setWaterIntake(newWater);
    await updateDailyLog(selectedDateStr, newMood, newSleep, newWater);
  };

  const getHabitStatus = (habitId: string) => {
    const record = habitRecords.find(hr => hr.habit_id === habitId && hr.date === selectedDateStr);
    return record ? record.value > 0 : false;
  };

  const handleHabitToggle = async (habitId: string, currentChecked: boolean) => {
    await recordHabitValue(habitId, selectedDateStr, currentChecked ? 0 : 1);
    showToast('Habit progress updated.', 'success');
  };

  const completedTasks = tasks.filter(t => t.status === 'done' && t.due_date && t.due_date.startsWith(selectedDateStr));

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );

      // Ctrl+S / Cmd+S to save journal entry immediately
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSaveStatus('saving');
        saveEntryForDate(selectedDateStr, formValuesRef.current);
        setSaveStatus('saved');
        showToast('Journal entry saved.', 'success');
        setHasAutoSaved(true);
        if (isTyping) {
          (activeEl as HTMLElement).blur();
        }
      }

      if (e.key === 'Escape') {
        if (isTyping) {
          (activeEl as HTMLElement).blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDateStr, hasAutoSaved, saveEntryForDate, showToast]);

  // Debounced auto-save effect
  useEffect(() => {
    if (saveStatus !== 'dirty') return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      const values = formValuesRef.current;
      saveEntryForDate(selectedDateStr, values);
      setSaveStatus('saved');
      if (!hasAutoSaved) {
        showToast('Journal auto-saved.', 'success');
        setHasAutoSaved(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    saveStatus,
    mIntention1,
    mIntention2,
    mIntention3,
    eLearned1,
    eLearned2,
    eLearned3,
    eBetter1,
    eBetter2,
    eBetter3,
    freeText,
    selectedDateStr,
    hasAutoSaved,
    saveEntryForDate,
    showToast
  ]);

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (saveStatus === 'dirty') {
        saveEntryForDate(prevDateRef.current, formValuesRef.current);
      }
    };
  }, [saveStatus, saveEntryForDate]);

  // Warning before unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your journal. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveStatus]);

  // ==========================================
  // SAVE JOURNAL ENTRY
  // ==========================================
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    const morning = [mIntention1, mIntention2, mIntention3].filter((s) => s.trim().length > 0);
    const learned = [eLearned1, eLearned2, eLearned3].filter((s) => s.trim().length > 0);
    const better = [eBetter1, eBetter2, eBetter3].filter((s) => s.trim().length > 0);

    updateJournalEntry(selectedDateStr, morning, learned, better, freeText);
    setSaveStatus('saved');
    showToast('Journal entry saved.', 'success');
    setHasAutoSaved(true);
  };

  // ==========================================
  // SEARCH & FILTER HISTORICAL LOGS
  // ==========================================
  const getFilteredLogs = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return journalEntries.sort((a, b) => b.date.localeCompare(a.date));

    return journalEntries
      .filter((entry) => {
        const matchesIntentions = entry.morning_intentions.some((s) => s.toLowerCase().includes(query));
        const matchesLearned = entry.evening_reflections_learned.some((s) => s.toLowerCase().includes(query));
        const matchesBetter = entry.evening_reflections_better.some((s) => s.toLowerCase().includes(query));
        const matchesNotes = entry.free_text?.toLowerCase().includes(query);
        const matchesDate = entry.date.includes(query);

        return matchesIntentions || matchesLearned || matchesBetter || matchesNotes || matchesDate;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const filteredLogs = getFilteredLogs();

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-12 animate-pulse">
          <div className="app-panel w-full px-6 py-6">
            <div className="mb-2 h-8 w-48 bg-border/40 rounded-xl" />
            <div className="h-4 w-80 bg-border/20 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="app-panel lg:col-span-2 space-y-6 p-6">
              <div className="h-4 w-32 bg-border/30 rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 w-full bg-border/20 rounded-2xl" />
                <div className="h-8 w-full bg-border/20 rounded-2xl" />
                <div className="h-24 w-full bg-border/20 rounded-[20px]" />
              </div>
            </div>
            <div className="space-y-8 lg:col-span-1">
              <div className="app-panel space-y-4 p-6">
                <div className="h-4 w-24 bg-border/30 rounded-xl" />
                <div className="h-8 w-full bg-border/20 rounded-2xl" />
                <div className="h-16 w-full bg-border/20 rounded-[20px]" />
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <SectionHeader
        title="Journal"
        subtitle="Morning intentions, evening reflections, and one place to preserve the shape of the day."
        meta={selectedDateStr}
      />

      {/* Mobile view Tab Selector */}
      <div className="app-panel-subtle flex overflow-hidden lg:hidden font-label text-xs">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`btn-press flex-1 px-3 py-3 text-center uppercase tracking-[0.18em] font-bold ${mobileTab === 'editor' ? 'bg-primary text-on-primary' : 'text-primary bg-surface hover:bg-neutral-bg/50'}`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('metrics')}
          className={`btn-press flex-1 border-x border-border px-3 py-3 text-center uppercase tracking-[0.18em] font-bold ${mobileTab === 'metrics' ? 'bg-primary text-on-primary' : 'text-primary bg-surface hover:bg-neutral-bg/50'}`}
        >
          Insights
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('timeline')}
          className={`btn-press flex-1 px-3 py-3 text-center uppercase tracking-[0.18em] font-bold ${mobileTab === 'timeline' ? 'bg-primary text-on-primary' : 'text-primary bg-surface hover:bg-neutral-bg/50'}`}
        >
          Timeline
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1 & 2: ACTIVE JOURNAL WRITER
           ========================================== */}
        <section className={`app-panel lg:col-span-2 space-y-6 p-5 sm:p-6 ${mobileTab !== 'editor' ? 'hidden lg:block' : ''}`}>
          <form onSubmit={handleSaveJournal} className="space-y-6">
            
            {/* Header select date bar */}
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="app-kicker">Entry</p>
                <h2 className="mt-2 font-display text-2xl text-primary">Write the day while it is still clear.</h2>
              </div>

              <div className="flex items-center space-x-2 font-label text-xs">
                <Calendar className="h-4 w-4 text-accent" />
                <Input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="min-h-11 px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            {/* Morning Intentions */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="font-serif text-lg font-bold text-primary">I. Morning Intentions</span>
                <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold">&mdash; What would make today great?</span>
              </div>

              <div className="space-y-2 font-label text-xs">
                <Input
                  type="text"
                  value={mIntention1}
                  onChange={(e) => { setMIntention1(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="1. e.g. Execute clean SQL migrations successfully"
                  className="bg-neutral-bg/45"
                />
                <Input
                  type="text"
                  value={mIntention2}
                  onChange={(e) => { setMIntention2(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="2. e.g. Interval running outdoors 35 minutes"
                  className="bg-neutral-bg/45"
                />
                <Input
                  type="text"
                  value={mIntention3}
                  onChange={(e) => { setMIntention3(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="3. e.g. Read draft of design system standard"
                  className="bg-neutral-bg/45"
                />
              </div>
            </div>

            {/* Evening Reflections */}
            <div className="space-y-4 pt-4 border-t border-border">
              
              {/* Learned items */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="font-serif text-lg font-bold text-primary">II. Evening Lessons</span>
                  <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold">&mdash; What did I learn today?</span>
                </div>
                
                <div className="space-y-2 font-label text-xs">
                  <Input
                    type="text"
                    value={eLearned1}
                    onChange={(e) => { setELearned1(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="1. e.g. Next.js fonts load as local stylesheet resources"
                    className="bg-neutral-bg/45"
                  />
                  <Input
                    type="text"
                    value={eLearned2}
                    onChange={(e) => { setELearned2(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="2. e.g. Flat designs require clean negative spaces to feel premium"
                    className="bg-neutral-bg/45"
                  />
                  <Input
                    type="text"
                    value={eLearned3}
                    onChange={(e) => { setELearned3(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="3. e.g. Leitner card deck reviews work best daily"
                    className="bg-neutral-bg/45"
                  />
                </div>
              </div>

              {/* Improvements */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="font-serif text-md font-bold text-primary">III. Refinements</span>
                  <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold">&mdash; What could have been better?</span>
                </div>
                
                <div className="space-y-2 font-label text-xs">
                  <Input
                    type="text"
                    value={eBetter1}
                    onChange={(e) => { setEBetter1(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="1. e.g. Avoid starting tasks past 9 PM"
                    className="bg-neutral-bg/45"
                  />
                  <Input
                    type="text"
                    value={eBetter2}
                    onChange={(e) => { setEBetter2(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="2. e.g. Set reminders for hydration goals"
                    className="bg-neutral-bg/45"
                  />
                  <Input
                    type="text"
                    value={eBetter3}
                    onChange={(e) => { setEBetter3(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="3. e.g. Keep card answers shorter for Leitner system"
                    className="bg-neutral-bg/45"
                  />
                </div>
              </div>

            </div>

            {/* Free Notes Diary */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="font-serif text-lg font-bold text-primary">IV. Daily Log</span>
                <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold">&mdash; Free thoughts and reflections</span>
              </div>
              <Textarea
                value={freeText}
                onChange={(e) => { setFreeText(e.target.value); setSaveStatus('dirty'); }}
                rows={5}
                placeholder="Write freely here..."
                className="bg-neutral-bg/45 resize-none leading-relaxed min-h-[160px]"
              />
            </div>

            {/* The single primary Terracotta red Reserved action button */}
            <div className="app-panel-subtle flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-label text-xs uppercase tracking-[0.18em] text-secondary font-bold">
                {saveStatus === 'saved' && '• Saved'}
                {saveStatus === 'saving' && '• Saving...'}
                {saveStatus === 'dirty' && '• Unsaved changes'}
              </span>
              <PrimaryButton 
                type="submit" 
                disabled={saveStatus === 'saving'}
                className="w-full sm:w-auto"
              >
                {saveStatus === 'saving' ? 'SAVING...' : 'SAVE CHRONICLE ENTRY'}
              </PrimaryButton>
            </div>

          </form>
        </section>

        {/* ==========================================
            COLUMN 3: DAILY METRICS & TIMELINE
           ========================================== */}
        <div className={`space-y-8 lg:col-span-1 ${mobileTab === 'editor' ? 'hidden lg:block' : ''}`}>
          
          {/* DAILY INSIGHTS & METRICS PANEL */}
          <section className={`app-panel space-y-6 p-5 sm:p-6 ${mobileTab === 'timeline' ? 'hidden lg:block' : ''}`}>
            <div className="border-b border-border pb-3 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-accent" />
              <span className="font-label text-xs text-primary uppercase tracking-[0.15em] font-bold">
                Day Insights & Metrics
              </span>
            </div>

            {/* Mood Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-label text-xs text-secondary uppercase font-bold">Daily Mood</span>
                <span className="font-serif text-xs font-bold text-accent">
                  {mood === 1 && '1 - Terrible'}
                  {mood === 2 && '2 - Bad'}
                  {mood === 3 && '3 - Okay'}
                  {mood === 4 && '4 - Good'}
                  {mood === 5 && '5 - Excellent'}
                </span>
              </div>
              <div className="flex gap-1.5 bg-background border border-border rounded-2xl p-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleMetricChange(val, sleepHours, waterIntake)}
                    className={`btn-press flex-1 rounded-xl border py-2 text-center font-label text-xs uppercase transition-all font-bold ${
                      mood === val ? 'bg-primary text-on-primary border-primary font-bold' : 'border-transparent text-secondary hover:border-border hover:bg-neutral-bg/50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep and Hydration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 font-label text-xs">
                <div className="flex items-center space-x-1.5">
                  <Moon className="h-3.5 w-3.5 text-secondary" />
                  <span className="uppercase text-secondary font-bold">Sleep (Hrs)</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => handleMetricChange(mood, parseFloat(e.target.value) || 0, waterIntake)}
                  className="bg-neutral-bg text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5 font-label text-xs">
                <div className="flex items-center space-x-1.5">
                  <Droplet className="h-3.5 w-3.5 text-accent" />
                  <span className="uppercase text-secondary font-bold">Water (L)</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.25"
                  value={waterIntake}
                  onChange={(e) => handleMetricChange(mood, sleepHours, parseFloat(e.target.value) || 0)}
                  className="bg-neutral-bg text-xs font-semibold"
                />
              </div>
            </div>

            {/* Habits tracker for this day */}
            <div className="space-y-2.5 pt-4 border-t border-border">
              <span className="font-label text-xs text-secondary uppercase tracking-wider block font-bold">
                Habits Tracker
              </span>
              <div className="space-y-2.5 rounded-[20px] bg-neutral-bg/45 p-4 border border-border">
                {habits.filter(h => !h.is_archived).map((habit) => {
                  const checked = getHabitStatus(habit.id);
                  return (
                    <label key={habit.id} className="flex items-center justify-between font-sans text-xs text-primary cursor-pointer">
                      <span className={checked ? 'line-through text-secondary opacity-65 font-semibold' : 'font-semibold'}>
                        {habit.name}
                        {habit.type === 'numeric' && ` (Goal: ${habit.goal}${habit.unit || ''})`}
                      </span>
                      <Checkbox
                        checked={checked}
                        onChange={() => handleHabitToggle(habit.id, checked)}
                        className="h-4.5 w-4.5"
                      />
                    </label>
                  );
                })}
                {habits.filter(h => !h.is_archived).length === 0 && (
                  <p className="font-sans text-xs text-secondary italic text-center">No active habits configured.</p>
                )}
              </div>
            </div>

            {/* Completed Tasks on this Day */}
            <div className="space-y-2 pt-4 border-t border-border">
              <span className="font-label text-xs text-secondary uppercase tracking-wider block font-bold">
                Tasks Completed Today
              </span>
              <div className="space-y-2 rounded-[20px] bg-neutral-bg/45 p-4 border border-border max-h-36 overflow-y-auto">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-2 text-xs font-sans text-primary">
                    <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate font-semibold">{task.name}</span>
                  </div>
                ))}
                {completedTasks.length === 0 && (
                  <p className="font-sans text-xs text-secondary italic text-center">No tasks completed today.</p>
                )}
              </div>
            </div>
          </section>

          {/* HISTORICAL TIMELINE PANEL */}
          <section className={`app-panel flex max-h-[500px] flex-col justify-between p-5 sm:p-6 ${mobileTab === 'metrics' ? 'hidden lg:block' : ''}`}>
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block border-b border-border pb-1 font-bold">
                Historical Timeline
              </span>

              {/* Search Input Bar */}
              <div className="relative font-label text-xs">
                <Search className="h-4 w-4 text-secondary absolute left-3 top-2.5" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past logs..."
                  className="bg-neutral-bg pl-9 pr-3"
                />
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-3">
                {filteredLogs.map((entry) => {
                  const formattedLogDate = new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <div
                      key={entry.date}
                      onClick={() => {
                        setSelectedDateStr(entry.date);
                        // Auto-toggle back to editor on mobile when selecting a past date
                        setMobileTab('editor');
                      }}
                      className={`btn-press flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        selectedDateStr === entry.date ? 'bg-neutral-bg border-primary' : 'bg-surface border-border/60 hover:bg-neutral-bg/20 hover:border-primary'
                      }`}
                    >
                      <div>
                        <span className="font-label text-xs font-bold text-primary block">
                          {formattedLogDate.toUpperCase()}
                        </span>
                        {entry.morning_intentions[0] && (
                          <span className="font-sans text-xs text-secondary line-clamp-1 mt-1 italic">
                            &ldquo;{entry.morning_intentions[0]}&rdquo;
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-secondary shrink-0 ml-2" />
                    </div>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <EmptyState
                    title="No matching entries"
                    description="Try a different date or keyword to surface older journal entries."
                  />
                )}
              </div>
            </div>
          </section>
          
        </div>

      </div>
    </PageShell>
  );
}
