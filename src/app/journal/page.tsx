'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import { Search, Calendar, ChevronRight, Activity, Smile, Moon, Droplet, CheckCircle } from 'lucide-react';

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
  const saveEntryForDate = (dateStr: string, values: typeof formValuesRef.current) => {
    const morning = [values.mIntention1, values.mIntention2, values.mIntention3].filter((s) => s.trim().length > 0);
    const learned = [values.eLearned1, values.eLearned2, values.eLearned3].filter((s) => s.trim().length > 0);
    const better = [values.eBetter1, values.eBetter2, values.eBetter3].filter((s) => s.trim().length > 0);
    updateJournalEntry(dateStr, morning, learned, better, values.freeText);
  };

  // Load data and handle date transition saving
  useEffect(() => {
    const prevDate = prevDateRef.current;
    
    // 1. If switching dates and form is dirty, flush previous date's changes
    if (prevDate && prevDate !== selectedDateStr && saveStatus === 'dirty') {
      saveEntryForDate(prevDate, formValuesRef.current);
    }

    // 2. Load the entry for the selected date
    const entry = journalEntries.find((j) => j.date === selectedDateStr);
    const dateChanged = prevDate !== selectedDateStr;

    if (dateChanged || saveStatus === 'saved') {
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
  }, [selectedDateStr, journalEntries]);

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
  }, [selectedDateStr, hasAutoSaved]);

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
    showToast
  ]);

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (saveStatus === 'dirty') {
        saveEntryForDate(prevDateRef.current, formValuesRef.current);
      }
    };
  }, [saveStatus]);

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
      <div className="space-y-12 animate-pulse">
        <header className="border-b-2 border-[#6C7278]/20 pb-4">
          <div className="h-8 bg-[#6C7278]/15 w-48 rounded-sm mb-2" />
          <div className="h-4 bg-[#6C7278]/10 w-80 rounded-sm" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-[#6C7278]/20 p-6 rounded-sm space-y-6">
            <div className="h-4 bg-[#6C7278]/15 w-32 rounded-sm" />
            <div className="space-y-4">
              <div className="h-8 bg-[#6C7278]/10 w-full rounded-sm" />
              <div className="h-8 bg-[#6C7278]/10 w-full rounded-sm" />
              <div className="h-24 bg-[#6C7278]/10 w-full rounded-sm" />
            </div>
          </div>
          <div className="space-y-8 lg:col-span-1">
            <div className="bg-white border border-[#6C7278]/20 p-6 rounded-sm space-y-4">
              <div className="h-4 bg-[#6C7278]/15 w-24 rounded-sm" />
              <div className="h-8 bg-[#6C7278]/10 w-full rounded-sm" />
              <div className="h-16 bg-[#6C7278]/10 w-full rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex justify-between items-baseline">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            THE CHRONICLES
          </h2>
          <p className="font-label text-xs text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Morning Intentions &bull; Evening Reflections &bull; Journal
          </p>
        </div>
      </header>

      {/* Mobile view Tab Selector */}
      <div className="flex lg:hidden border border-[#6C7278] font-label text-xs">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 text-center py-2.5 uppercase tracking-wider font-bold cursor-pointer ${mobileTab === 'editor' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] bg-white'}`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('metrics')}
          className={`flex-1 text-center py-2.5 uppercase tracking-wider font-bold border-x border-[#6C7278] cursor-pointer ${mobileTab === 'metrics' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] bg-white'}`}
        >
          Insights
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 text-center py-2.5 uppercase tracking-wider font-bold cursor-pointer ${mobileTab === 'timeline' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] bg-white'}`}
        >
          Timeline
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1 & 2: ACTIVE JOURNAL WRITER
           ========================================== */}
        <section className={`lg:col-span-2 bg-white border border-[#6C7278] p-6 rounded-sm space-y-6 ${mobileTab !== 'editor' ? 'hidden lg:block' : ''}`}>
          <form onSubmit={handleSaveJournal} className="space-y-6">
            
            {/* Header select date bar */}
            <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-3">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] font-semibold">
                Journal Entry Editor
              </span>

              <div className="flex items-center space-x-2 font-label text-xs">
                <Calendar className="h-4 w-4 text-[#B8422E]" />
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="bg-[#F7F5F2] border border-[#6C7278] px-2 py-1 font-sans focus:outline-none"
                />
              </div>
            </div>

            {/* Morning Intentions */}
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <span className="font-display text-lg font-bold text-[#1A1C1E]">I. Morning Intentions</span>
                <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider">&mdash; What would make today great?</span>
              </div>

              <div className="space-y-2 font-label text-xs">
                <input
                  type="text"
                  value={mIntention1}
                  onChange={(e) => { setMIntention1(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="1. e.g. Execute clean SQL migrations successfully"
                  className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                />
                <input
                  type="text"
                  value={mIntention2}
                  onChange={(e) => { setMIntention2(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="2. e.g. Interval running outdoors 35 minutes"
                  className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                />
                <input
                  type="text"
                  value={mIntention3}
                  onChange={(e) => { setMIntention3(e.target.value); setSaveStatus('dirty'); }}
                  placeholder="3. e.g. Read draft of design system standard"
                  className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                />
              </div>
            </div>

            {/* Evening Reflections */}
            <div className="space-y-4 pt-4 border-t border-[#6C7278]/25">
              
              {/* Learned items */}
              <div className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <span className="font-display text-lg font-bold text-[#1A1C1E]">II. Evening Lessons</span>
                  <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider">&mdash; What did I learn today?</span>
                </div>
                
                <div className="space-y-2 font-label text-xs">
                  <input
                    type="text"
                    value={eLearned1}
                    onChange={(e) => { setELearned1(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="1. e.g. Next.js fonts load as local stylesheet resources"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                  <input
                    type="text"
                    value={eLearned2}
                    onChange={(e) => { setELearned2(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="2. e.g. Flat designs require clean negative spaces to feel premium"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                  <input
                    type="text"
                    value={eLearned3}
                    onChange={(e) => { setELearned3(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="3. e.g. Leitner card deck reviews work best daily"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                </div>
              </div>

              {/* Improvements */}
              <div className="space-y-3 pt-2">
                <div className="flex items-baseline space-x-2">
                  <span className="font-display text-md font-bold text-[#1A1C1E]">III. Refinements</span>
                  <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider">&mdash; What could have been better?</span>
                </div>
                
                <div className="space-y-2 font-label text-xs">
                  <input
                    type="text"
                    value={eBetter1}
                    onChange={(e) => { setEBetter1(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="1. e.g. Avoid starting tasks past 9 PM"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                  <input
                    type="text"
                    value={eBetter2}
                    onChange={(e) => { setEBetter2(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="2. e.g. Set reminders for hydration goals"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                  <input
                    type="text"
                    value={eBetter3}
                    onChange={(e) => { setEBetter3(e.target.value); setSaveStatus('dirty'); }}
                    placeholder="3. e.g. Keep card answers shorter for Leitner system"
                    className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-3 py-1.5 focus:outline-none focus:border-[#B8422E] font-sans"
                  />
                </div>
              </div>

            </div>

            {/* Free Notes Diary */}
            <div className="space-y-3 pt-4 border-t border-[#6C7278]/25">
              <div className="flex items-baseline space-x-2">
                <span className="font-display text-lg font-bold text-[#1A1C1E]">IV. Daily Log</span>
                <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider">&mdash; Free thoughts and reflections</span>
              </div>
              <textarea
                value={freeText}
                onChange={(e) => { setFreeText(e.target.value); setSaveStatus('dirty'); }}
                rows={5}
                placeholder="Write freely here..."
                className="w-full bg-[#F7F5F2]/45 border border-[#6C7278]/40 px-4 py-3 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans resize-none leading-relaxed"
              />
            </div>

            {/* The single primary Terracotta red Reserved action button */}
            <div className="flex items-center justify-between gap-4">
              <span className="font-label text-xs uppercase tracking-wider text-[#6C7278]">
                {saveStatus === 'saved' && '• Saved'}
                {saveStatus === 'saving' && '• Saving...'}
                {saveStatus === 'dirty' && '• Unsaved changes'}
              </span>
              <button 
                type="submit" 
                disabled={saveStatus === 'saving'}
                className="flex-1 btn-tertiary uppercase text-xs tracking-widest font-bold pt-3 pb-3 cursor-pointer disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'SAVING...' : 'SAVE CHRONICLE ENTRY'}
              </button>
            </div>

          </form>
        </section>

        {/* ==========================================
            COLUMN 3: DAILY METRICS & TIMELINE
           ========================================== */}
        <div className={`space-y-8 lg:col-span-1 ${mobileTab === 'editor' ? 'hidden lg:block' : ''}`}>
          
          {/* DAILY INSIGHTS & METRICS PANEL */}
          <section className={`bg-white border border-[#6C7278] p-6 rounded-sm space-y-6 shadow-sm ${mobileTab === 'timeline' ? 'hidden lg:block' : ''}`}>
            <div className="border-b border-[#6C7278]/25 pb-2 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-[#B8422E]" />
              <span className="font-label text-xs text-[#1A1C1E] uppercase tracking-[0.15em] font-bold">
                Day Insights & Metrics
              </span>
            </div>

            {/* Mood Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-label text-xs text-[#6C7278] uppercase font-bold">Daily Mood</span>
                <span className="font-display text-sm font-semibold text-[#B8422E]">
                  {mood === 1 && '1 - Terrible'}
                  {mood === 2 && '2 - Bad'}
                  {mood === 3 && '3 - Okay'}
                  {mood === 4 && '4 - Good'}
                  {mood === 5 && '5 - Excellent'}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleMetricChange(val, sleepHours, waterIntake)}
                    className={`flex-1 py-1 text-center font-label text-xs uppercase border rounded-[2px] transition-all cursor-pointer ${
                      mood === val ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'border-[#6C7278]/30 text-[#6C7278] hover:border-[#1A1C1E] hover:text-[#1A1C1E]'
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
                  <Moon className="h-3.5 w-3.5 text-[#B8422E]" />
                  <span className="uppercase text-[#6C7278] font-bold">Sleep (Hrs)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => handleMetricChange(mood, parseFloat(e.target.value) || 0, waterIntake)}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1.5 font-sans focus:outline-none focus:border-[#B8422E]"
                />
              </div>
              <div className="space-y-1.5 font-label text-xs">
                <div className="flex items-center space-x-1.5">
                  <Droplet className="h-3.5 w-3.5 text-[#B8422E]" />
                  <span className="uppercase text-[#6C7278] font-bold">Water (L)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.25"
                  value={waterIntake}
                  onChange={(e) => handleMetricChange(mood, sleepHours, parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1.5 font-sans focus:outline-none focus:border-[#B8422E]"
                />
              </div>
            </div>

            {/* Habits tracker for this day */}
            <div className="space-y-2.5 pt-4 border-t border-[#6C7278]/20">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block font-bold">
                Habits Tracker
              </span>
              <div className="space-y-2.5 bg-[#F7F5F2]/45 p-3 border border-[#6C7278]/15 rounded-sm">
                {habits.filter(h => !h.is_archived).map((habit) => {
                  const checked = getHabitStatus(habit.id);
                  return (
                    <label key={habit.id} className="flex items-center justify-between font-sans text-xs text-[#1A1C1E] cursor-pointer">
                      <span className={checked ? 'line-through text-[#6C7278]' : ''}>
                        {habit.name}
                        {habit.type === 'numeric' && ` (Goal: ${habit.goal}${habit.unit || ''})`}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleHabitToggle(habit.id, checked)}
                        className="h-4 w-4 accent-[#B8422E] cursor-pointer"
                      />
                    </label>
                  );
                })}
                {habits.filter(h => !h.is_archived).length === 0 && (
                  <p className="font-sans text-xs text-[#6C7278] italic text-center">No active habits configured.</p>
                )}
              </div>
            </div>

            {/* Completed Tasks on this Day */}
            <div className="space-y-2 pt-4 border-t border-[#6C7278]/20">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block font-bold">
                Tasks Completed Today
              </span>
              <div className="space-y-2 bg-[#F7F5F2]/45 p-3 border border-[#6C7278]/15 rounded-sm max-h-36 overflow-y-auto">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-2 text-xs font-sans text-[#1A1C1E]">
                    <CheckCircle className="h-3.5 w-3.5 text-[#B8422E] shrink-0" />
                    <span className="truncate">{task.name}</span>
                  </div>
                ))}
                {completedTasks.length === 0 && (
                  <p className="font-sans text-xs text-[#6C7278] italic text-center">No tasks completed today.</p>
                )}
              </div>
            </div>
          </section>

          {/* HISTORICAL TIMELINE PANEL */}
          <section className={`bg-white border border-[#6C7278] p-6 rounded-sm flex flex-col justify-between max-h-[500px] shadow-sm ${mobileTab === 'metrics' ? 'hidden lg:block' : ''}`}>
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block border-b border-[#6C7278]/25 pb-1">
                Historical Timeline
              </span>

              {/* Search Input Bar */}
              <div className="relative font-label text-xs">
                <Search className="h-4 w-4 text-[#6C7278] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past logs..."
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] pl-9 pr-3 py-2 focus:outline-none focus:border-[#B8422E] font-sans"
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
                      className={`p-3 border border-[#6C7278]/35 rounded-sm hover:border-[#1A1C1E] cursor-pointer transition-all flex justify-between items-center ${
                        selectedDateStr === entry.date ? 'bg-[#F7F5F2] border-[#1A1C1E]' : 'bg-white'
                      }`}
                    >
                      <div>
                        <span className="font-label text-xs font-bold text-[#1A1C1E] block">
                          {formattedLogDate.toUpperCase()}
                        </span>
                        {entry.morning_intentions[0] && (
                          <span className="font-sans text-xs text-[#6C7278] line-clamp-1 mt-1 italic">
                            &ldquo;{entry.morning_intentions[0]}&rdquo;
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#6C7278] shrink-0 ml-2" />
                    </div>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <p className="font-sans text-xs text-[#6C7278] italic text-center py-12">No matching logs found.</p>
                )}
              </div>
            </div>
          </section>
          
        </div>

      </div>
    </div>
  );
}
