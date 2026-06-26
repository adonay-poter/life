'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import { Search, Calendar, ChevronRight } from 'lucide-react';

export default function JournalPage() {
  const { journalEntries, updateJournalEntry } = useDashboard();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1 & 2: ACTIVE JOURNAL WRITER
           ========================================== */}
        <section className="lg:col-span-2 bg-white border border-[#6C7278] p-6 rounded-sm space-y-6">
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
            COLUMN 3: SEARCHABLE HISTORICAL TIMELINE
           ========================================== */}
        <section className="bg-white border border-[#6C7278] p-6 rounded-sm flex flex-col justify-between max-h-[700px]">
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
                    onClick={() => setSelectedDateStr(entry.date)}
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
  );
}
