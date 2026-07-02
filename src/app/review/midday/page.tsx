'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ReviewFlowShell from '@/components/ui/ReviewFlowShell';
import { Input } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Square,
  CheckSquare,
  Coffee,
  ListTodo,
  CheckCircle,
  HelpCircle,
  FolderKanban,
  Clock,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  'Morning Captures',
  'What Matters Now',
  'Learning Check',
  'Project Attention',
  'Final Midday Brief'
];

export default function MiddayReview() {
  const {
    inboxItems,
    tasks,
    projects,
    knowledgeItems,
    saveReviewEntry,
    updateInboxItemStatus,
    updateTaskStatus,
    dailyDigests
  } = useDashboard();

  const { showToast } = useToast();
  const todayStr = getLocalDateString();
  const [currentStep, setCurrentStep] = useState(0);

  // States for reviews inputs
  const [dailyFocus, setDailyFocus] = useState('');
  const [openLoopAnswers, setOpenLoopAnswers] = useState<Record<string, string>>({});

  // 1. Morning Captures (Unprocessed captures created today)
  const morningCaptures = useMemo(() => {
    return inboxItems.filter(i => {
      const isToday = i.created_at.split('T')[0] === todayStr;
      const isUnprocessed = i.status === 'unprocessed' || i.status === 'unsorted';
      return isToday && isUnprocessed;
    });
  }, [inboxItems, todayStr]);

  // 2. Learning Check (Knowledge created today + unresolved questions today)
  const knowledgeToday = useMemo(() => {
    return knowledgeItems.filter(k => k.created_at.split('T')[0] === todayStr);
  }, [knowledgeItems, todayStr]);

  const openQuestionsToday = useMemo(() => {
    const todayDigest = dailyDigests.find(d => d.date === todayStr);
    return todayDigest?.open_questions || [];
  }, [dailyDigests, todayStr]);

  // 3. Project Attention (Active projects touched or needing next action)
  const activeProjects = useMemo(() => {
    return projects.filter(p => !p.is_archived && p.status !== 'completed' && p.status !== 'cancelled');
  }, [projects]);

  // Actions on step elements
  const handleProcessItem = async (itemId: string, action: 'task' | 'knowledge' | 'archive') => {
    try {
      if (action === 'archive') {
        await updateInboxItemStatus(itemId, 'archived');
        showToast('Item archived.', 'info');
      } else {
        await updateInboxItemStatus(itemId, 'processed');
        showToast(`Item marked processed as ${action}.`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error processing item.', 'error');
    }
  };

  const handleStepNext = () => {
    if (currentStep === 1 && !dailyFocus.trim()) {
      showToast('Please state what matters most for the rest of today.', 'warning');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleStepPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleCompleteReview = async () => {
    try {
      await saveReviewEntry('midday', todayStr, {
        focus_text: dailyFocus,
        answers: openLoopAnswers,
        completed_at: new Date().toISOString()
      });
      showToast('Midday review complete. Rest of the day is structured.', 'success');
      window.location.href = '/review';
    } catch (err) {
      console.error(err);
      showToast('Failed to save midday review.', 'error');
    }
  };

  return (
    <ReviewFlowShell
      title="Midday Checkpoint"
      subtitle="Calibrate expectations, process inbox, and define focus"
      steps={STEPS}
      currentStep={currentStep}
      onNext={handleStepNext}
      onPrev={handleStepPrev}
      onComplete={handleCompleteReview}
      isCompleteDisabled={!dailyFocus.trim()}
    >
      {/* STEP 1: MORNING CAPTURES */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Intake Slips Captured Today</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Triage what was captured during the morning hours. Clear the desk before the afternoon begins.
            </p>
          </div>

          {morningCaptures.length > 0 ? (
            <div className="space-y-3">
              {morningCaptures.map(item => (
                <div key={item.id} className="border border-border bg-background p-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-label text-[9px] bg-secondary/15 px-1 py-0.5 uppercase tracking-wide">{item.type}</span>
                      <span className="font-sans font-bold text-xs text-primary truncate">{item.title}</span>
                    </div>
                    {item.content && <p className="font-sans text-[11px] text-secondary line-clamp-2 leading-relaxed">{item.content}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0 self-end sm:self-auto font-label text-[9px] font-bold">
                    <button
                      onClick={() => handleProcessItem(item.id, 'task')}
                      className="border border-border hover:border-primary px-2.5 py-1 text-primary bg-surface cursor-pointer"
                    >
                      TASK
                    </button>
                    <button
                      onClick={() => handleProcessItem(item.id, 'knowledge')}
                      className="border border-border hover:border-primary px-2.5 py-1 text-primary bg-surface cursor-pointer"
                    >
                      NOTE
                    </button>
                    <button
                      onClick={() => handleProcessItem(item.id, 'archive')}
                      className="text-danger border border-danger/20 hover:border-danger bg-surface px-2.5 py-1 cursor-pointer"
                    >
                      ARCHIVE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border bg-background/30">
              <p className="font-sans text-xs text-secondary italic">No morning captures requiring attention. Desk is clear.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: WHAT MATTERS NOW */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Determine the Core Focus</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Declare the single most important target for the rest of today. What would make today successful?
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="dailyFocus" className="font-label text-xs uppercase font-bold text-secondary">Focus Statement</label>
              <textarea
                id="dailyFocus"
                value={dailyFocus}
                onChange={(e) => setDailyFocus(e.target.value)}
                placeholder="The single thing that matters for the rest of today is..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent resize-none rounded-none transition-colors"
                rows={4}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="notes" className="font-label text-xs uppercase font-bold text-secondary">Refinement Notes / Details (Optional)</label>
              <input
                id="notes"
                type="text"
                value={openLoopAnswers.midday_notes || ''}
                onChange={(e) => setOpenLoopAnswers({ ...openLoopAnswers, midday_notes: e.target.value })}
                placeholder="Any constraints, tools, or dependencies for this focus..."
                className="w-full bg-neutral-bg border border-border p-3 text-xs font-sans focus:outline-none focus:border-accent rounded-none transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LEARNING CHECK */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Today's Knowledge Output</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Verify what has been cataloged or discovered today so far. Keep information connected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Knowledge created today */}
            <div className="space-y-3">
              <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold block border-b border-border pb-1">Notes Authored Today</span>
              {knowledgeToday.length > 0 ? (
                <div className="space-y-2">
                  {knowledgeToday.map(note => (
                    <div key={note.id} className="border border-border bg-background p-3">
                      <span className="font-sans font-bold text-xs text-primary block">{note.title}</span>
                      {note.topic && <span className="font-label text-[9px] text-secondary uppercase block mt-1">Topic: {note.topic}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-sans text-xs text-secondary italic">No notes created yet today.</p>
              )}
            </div>

            {/* Questions logged */}
            <div className="space-y-3">
              <span className="font-label text-[10px] uppercase tracking-wider text-secondary font-bold block border-b border-border pb-1">Logged Questions</span>
              {openQuestionsToday.length > 0 ? (
                <div className="space-y-2">
                  {openQuestionsToday.map((q: string, i: number) => (
                    <div key={i} className="border border-border bg-background p-3 flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span className="font-sans text-xs text-primary italic leading-relaxed">{q}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-sans text-xs text-secondary italic">No questions captured today.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* STEP 4: PROJECT ATTENTION */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Review Projects Status</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Verify active projects needing calibration. Do they have clear next actions?
            </p>
          </div>

          <div className="space-y-3">
            {activeProjects.slice(0, 4).map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id);
              const activeTasks = projectTasks.filter(t => t.status !== 'done');
              
              return (
                <div key={project.id} className="border border-border bg-background p-4 flex justify-between items-center">
                  <div className="space-y-1 min-w-0">
                    <span className="font-sans font-bold text-xs text-primary truncate hover:text-accent">
                      <Link href={`/projects?projectId=${project.id}`}>{project.name}</Link>
                    </span>
                    <div className="flex gap-2 text-[10px] text-secondary font-label uppercase">
                      <span>{project.area}</span>
                      <span>•</span>
                      <span>{activeTasks.length} active tasks</span>
                    </div>
                  </div>
                  <div>
                    {activeTasks.length === 0 ? (
                      <span className="font-label text-[9px] uppercase font-bold text-danger border border-danger/30 px-2 py-0.5 bg-danger/5">No Action</span>
                    ) : (
                      <span className="font-label text-[9px] uppercase font-bold text-success border border-success/30 px-2 py-0.5 bg-success/5">Healthy</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: FINAL MIDDAY BRIEF */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Calibrated Briefing</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Summary of your checkpoint inputs. Complete the checkpoint to lock in your targets.
            </p>
          </div>

          <div className="border border-border bg-background p-6 space-y-4">
            <div>
              <span className="font-label text-[9px] uppercase font-bold text-accent tracking-wider block">Today's Selected Target</span>
              <p className="font-display text-xl font-bold text-primary mt-1">"{dailyFocus}"</p>
            </div>
            
            {openLoopAnswers.midday_notes && (
              <div>
                <span className="font-label text-[9px] uppercase font-bold text-secondary block">Constraints / Notes</span>
                <p className="font-sans text-xs text-primary mt-1">{openLoopAnswers.midday_notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs font-sans">
              <div>
                <span className="font-label text-[9px] uppercase font-bold text-secondary block">Captured Slips</span>
                <p className="font-semibold text-primary mt-1">{morningCaptures.length} waiting triage</p>
              </div>
              <div>
                <span className="font-label text-[9px] uppercase font-bold text-secondary block">Active Projects</span>
                <p className="font-semibold text-primary mt-1">{activeProjects.length} monitored</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReviewFlowShell>
  );
}
