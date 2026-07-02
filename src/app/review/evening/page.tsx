'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ReviewFlowShell from '@/components/ui/ReviewFlowShell';
import PageShell from '@/components/ui/PageShell';
import { Input } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Square,
  CheckSquare,
  CheckCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Inbox,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  "Today's Captures",
  "Today's Learning",
  "Today's Outputs",
  "Open Loops Check",
  "Tomorrow Inherits",
  "Journal Reflection"
];

export default function EveningReview() {
  const {
    inboxItems,
    tasks,
    projects,
    knowledgeItems,
    saveReviewEntry,
    updateJournalEntry,
    updateInboxItemStatus,
    updateTaskStatus,
    dailyDigests
  } = useDashboard();

  const { showToast } = useToast();
  const todayStr = getLocalDateString();
  const [currentStep, setCurrentStep] = useState(0);

  // Form states
  const [bestInsight, setBestInsight] = useState('');
  const [tomorrowInherits, setTomorrowInherits] = useState('');
  
  // Reflections
  const [reflection1, setReflection1] = useState(''); // what I learned
  const [reflection2, setReflection2] = useState(''); // what I avoided
  const [reflection3, setReflection3] = useState(''); // free notes

  const [completed, setCompleted] = useState(false);

  // Step 1: Captures categorized today
  const capturesToday = useMemo(() => {
    return inboxItems.filter(i => {
      const isToday = i.created_at.split('T')[0] === todayStr;
      return isToday;
    });
  }, [inboxItems, todayStr]);

  const capturesGrouped = useMemo(() => {
    return {
      unprocessed: capturesToday.filter(i => i.status === 'unprocessed' || i.status === 'unsorted'),
      processed: capturesToday.filter(i => i.status === 'processed' || i.status === 'task' || i.status === 'knowledge'),
      snoozed: capturesToday.filter(i => i.status === 'snoozed'),
      archived: capturesToday.filter(i => i.status === 'archived')
    };
  }, [capturesToday]);

  // Step 2: Learning Today
  const knowledgeToday = useMemo(() => {
    return knowledgeItems.filter(k => k.created_at.split('T')[0] === todayStr);
  }, [knowledgeItems, todayStr]);

  const openQuestionsToday = useMemo(() => {
    const todayDigest = dailyDigests.find(d => d.date === todayStr);
    return todayDigest?.open_questions || [];
  }, [dailyDigests, todayStr]);

  // Step 3: Outputs (Completed tasks today)
  const completedTasksToday = useMemo(() => {
    return tasks.filter(t => t.status === 'done' && t.due_date && t.due_date.split('T')[0] === todayStr);
  }, [tasks, todayStr]);

  // Step 4: Open Loops
  const openLoops = useMemo(() => {
    const unprocessed = inboxItems.filter(i => i.status === 'unprocessed' || i.status === 'unsorted');
    const unscheduledTasks = tasks.filter(t => t.status !== 'done' && t.inbox_item_id && !t.due_date);
    return { unprocessed, unscheduledTasks };
  }, [inboxItems, tasks]);

  const handleStepNext = () => {
    if (currentStep === 4 && !tomorrowInherits.trim()) {
      showToast('Please state what tomorrow should inherit.', 'warning');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleStepPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleCompleteReview = async () => {
    try {
      // 1. Save guided review entry
      await saveReviewEntry('evening', todayStr, {
        focus_text: `Tomorrow Inherits: ${tomorrowInherits}`,
        best_insight: bestInsight,
        tomorrow_inherits: tomorrowInherits,
        answers: {
          what_i_avoided: reflection2,
          notes: reflection3
        },
        completed_at: new Date().toISOString()
      });

      // 2. Write reflection to journal_entries
      if (updateJournalEntry) {
        await updateJournalEntry(
          todayStr,
          [`Inherit: ${tomorrowInherits}`], // intentions tomorrow
          [reflection1 || 'Learned new insights today.', bestInsight || 'Created output in LifeOS.'], // learned
          [reflection2 || 'Maintain clear workflow boundaries.'], // better
          reflection3 || 'Evening review closed successfully.' // free text
        );
      }

      showToast('Day closed. Tomorrow is prepared.', 'success');
      setCompleted(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to save evening review.', 'error');
    }
  };

  if (completed) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto text-center py-16 px-6 border border-border bg-surface space-y-6">
          <div className="w-12 h-12 bg-success/10 text-success rounded-none flex items-center justify-center mx-auto border border-success/30">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-primary">Day Successfully Closed</h2>
          <p className="font-sans text-xs text-secondary leading-relaxed">
            Your reflections have been committed to the Daily Journal and your review stats are recorded.
          </p>
          <div className="border border-border bg-background p-4 text-left space-y-2">
            <span className="font-label text-[9px] uppercase font-bold text-accent tracking-wider block">Tomorrow Starts With:</span>
            <p className="font-sans text-xs font-bold text-primary italic">"{tomorrowInherits}"</p>
          </div>
          <div className="pt-4">
            <Link
              href="/"
              className="w-full text-center bg-primary text-on-primary hover:opacity-90 transition-all font-label text-xs uppercase tracking-wider py-2.5 font-bold cursor-pointer inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <ReviewFlowShell
      title="Evening Review"
      subtitle="Reflect, close loops, and establish tomorrow's layout"
      steps={STEPS}
      currentStep={currentStep}
      onNext={handleStepNext}
      onPrev={handleStepPrev}
      onComplete={handleCompleteReview}
      isCompleteDisabled={!tomorrowInherits.trim()}
    >
      {/* STEP 1: TODAY'S CAPTURES */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Captured Slips Today</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Summary of items processed, snoozed, or archived during the day.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center font-label text-[10px] uppercase font-bold">
            <div className="bg-background border border-border p-3">
              <span className="text-secondary block">Processed</span>
              <span className="text-lg font-bold text-success block mt-1">{capturesGrouped.processed.length}</span>
            </div>
            <div className="bg-background border border-border p-3">
              <span className="text-secondary block">Snoozed / Open</span>
              <span className="text-lg font-bold text-accent block mt-1">
                {capturesGrouped.snoozed.length + capturesGrouped.unprocessed.length}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="font-label text-[10px] uppercase font-bold text-secondary block border-b border-border pb-1">Processed Today</span>
            {capturesGrouped.processed.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {capturesGrouped.processed.map(item => (
                  <div key={item.id} className="p-2 border border-border/40 bg-background/50 flex justify-between items-center text-xs">
                    <span className="text-primary truncate font-sans">{item.title}</span>
                    <span className="font-label text-[8px] uppercase text-success font-semibold shrink-0">Processed</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary italic">No captures processed today.</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: TODAY'S LEARNING */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Academy & Knowledge Summary</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Verify what has entered your knowledge system today.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="bestInsight" className="font-label text-xs uppercase font-bold text-secondary">Best Insight of the Day</label>
              <input
                id="bestInsight"
                type="text"
                value={bestInsight}
                onChange={(e) => setBestInsight(e.target.value)}
                placeholder="The single most important concept I understood today is..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent rounded-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-border p-3 bg-background">
                <span className="font-label text-[9px] uppercase font-bold text-secondary block mb-1">Notes Created</span>
                <span className="font-sans text-sm font-bold text-primary">{knowledgeToday.length} notes</span>
              </div>
              <div className="border border-border p-3 bg-background">
                <span className="font-label text-[9px] uppercase font-bold text-secondary block mb-1">Open Inquiries</span>
                <span className="font-sans text-sm font-bold text-primary">{openQuestionsToday.length} questions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: TODAY'S OUTPUTS */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Outputs & Actions Logged</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Review what tasks you successfully marked complete.
            </p>
          </div>

          <div className="space-y-3">
            {completedTasksToday.length > 0 ? (
              <div className="space-y-2">
                {completedTasksToday.map(task => (
                  <div key={task.id} className="border border-border bg-background p-3 flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-success shrink-0" />
                    <span className="font-sans text-xs text-primary font-bold line-through">{task.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border bg-background/30">
                <p className="font-sans text-xs text-secondary italic">No tasks completed with due dates today.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: OPEN LOOPS CHECK */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Inspect Open Loops</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Check what remains unprocessed or unscheduled.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-border p-4 bg-background space-y-2 text-xs">
              <p className="font-sans font-bold text-primary">Remaining Unprocessed Slips: {openLoops.unprocessed.length}</p>
              <p className="font-sans font-bold text-primary">Unscheduled Captured Tasks: {openLoops.unscheduledTasks.length}</p>
            </div>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Any outstanding unprocessed slips or tasks should be reviewed in the Triage Desk tomorrow.
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: TOMORROW INHERITS */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Tomorrow Inherits</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Select the single focus area or action tomorrow should inherit immediately upon starting.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="tomorrowInherits" className="font-label text-xs uppercase font-bold text-secondary">Inheritance Focus</label>
            <textarea
              id="tomorrowInherits"
              value={tomorrowInherits}
              onChange={(e) => setTomorrowInherits(e.target.value)}
              placeholder="Tomorrow will start with: [specific action / focus]..."
              className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent resize-none rounded-none transition-colors"
              rows={4}
              required
            />
          </div>
        </div>
      )}

      {/* STEP 6: JOURNAL REFLECTION */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Reflect and Close</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Record a brief self-assessment of the day. This will be cataloged in your journal.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ref1" className="font-label text-xs uppercase font-bold text-secondary">What did I learn today?</label>
              <input
                id="ref1"
                type="text"
                value={reflection1}
                onChange={(e) => setReflection1(e.target.value)}
                placeholder="Insights or takeaways discovered..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent rounded-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ref2" className="font-label text-xs uppercase font-bold text-secondary">What did I avoid or could improve?</label>
              <input
                id="ref2"
                type="text"
                value={reflection2}
                onChange={(e) => setReflection2(e.target.value)}
                placeholder="Frictions, blocks, or areas of resistance..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent rounded-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ref3" className="font-label text-xs uppercase font-bold text-secondary">Freeform Diary Notes</label>
              <textarea
                id="ref3"
                value={reflection3}
                onChange={(e) => setReflection3(e.target.value)}
                placeholder="Any general thoughts, events, or musings..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent resize-none rounded-none transition-colors"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </ReviewFlowShell>
  );
}
