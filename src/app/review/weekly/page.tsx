'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ReviewFlowShell from '@/components/ui/ReviewFlowShell';
import PageShell from '@/components/ui/PageShell';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { Input, Textarea } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Square,
  CheckSquare,
  CheckCircle,
  Inbox,
  FolderKanban,
  BookOpen,
  Calendar,
  AlertTriangle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  'Clear Inbox',
  'Review Knowledge',
  'Review Projects',
  'Review Tasks',
  'Next Week Focus',
  'Weekly Summary'
];

export default function WeeklyReview() {
  const {
    inboxItems,
    tasks,
    projects,
    knowledgeItems,
    saveReviewEntry,
    updateInboxItemStatus,
    updateTaskStatus
  } = useDashboard();

  const { showToast } = useToast();
  const todayStr = getLocalDateString();
  const [currentStep, setCurrentStep] = useState(0);

  // States
  const [nextWeekFocusProject, setNextWeekFocusProject] = useState('');
  const [nextWeekFocusLearning, setNextWeekFocusLearning] = useState('');
  const [nextWeekFocusHabit, setNextWeekFocusHabit] = useState('');
  const [weeklyNotes, setWeeklyNotes] = useState('');
  const [completed, setCompleted] = useState(false);

  // Step 1: Clear Inbox (Unprocessed inbox items older than 24 hours)
  const staleInboxItems = useMemo(() => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return inboxItems.filter(item => {
      const isUnprocessed = item.status === 'unprocessed' || item.status === 'unsorted';
      const isStale = new Date(item.created_at) < twentyFourHoursAgo;
      return isUnprocessed && isStale;
    });
  }, [inboxItems]);

  // Step 2: Review Knowledge (Created this week / last 7 days)
  const knowledgeThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return knowledgeItems.filter(item => new Date(item.created_at) >= sevenDaysAgo);
  }, [knowledgeItems]);

  // Step 3: Review Projects (Active projects touched or with no next action)
  const activeProjects = useMemo(() => {
    return projects.filter(p => !p.is_archived && p.status !== 'completed' && p.status !== 'cancelled');
  }, [projects]);

  const projectsNoAction = useMemo(() => {
    return activeProjects.filter(p => {
      const activeTasks = tasks.filter(t => t.project_id === p.id && t.status !== 'done');
      return activeTasks.length === 0;
    });
  }, [activeProjects, tasks]);

  // Step 4: Overdue and captured tasks
  const overdueTasks = useMemo(() => {
    const today = new Date(todayStr);
    return tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < today);
  }, [tasks, todayStr]);

  const handleProcessItem = async (itemId: string, action: 'processed' | 'archived') => {
    try {
      await updateInboxItemStatus(itemId, action);
      showToast(`Item marked as ${action}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error processing item.', 'error');
    }
  };

  const handleStepNext = () => {
    if (currentStep === 4 && (!nextWeekFocusProject.trim() || !nextWeekFocusLearning.trim())) {
      showToast('Please declare next week\'s core project and learning focus.', 'warning');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleStepPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleCompleteReview = async () => {
    try {
      const focusSummary = `Main Project: ${nextWeekFocusProject} | Learning Focus: ${nextWeekFocusLearning} | Habit/System Focus: ${nextWeekFocusHabit}`;
      await saveReviewEntry('weekly', todayStr, {
        focus_text: focusSummary,
        summary: weeklyNotes || 'Weekly review session completed.',
        tomorrow_inherits: `Core Project focus: ${nextWeekFocusProject}`,
        answers: {
          next_week_project: nextWeekFocusProject,
          next_week_learning: nextWeekFocusLearning,
          next_week_habit: nextWeekFocusHabit,
          weekly_notes: weeklyNotes
        },
        completed_at: new Date().toISOString()
      });
      showToast('Weekly review room closed. Integrities restored.', 'success');
      setCompleted(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to save weekly review.', 'error');
    }
  };

  if (completed) {
    return (
      <PageShell>
        <div className="app-panel max-w-md mx-auto text-center py-16 px-6 space-y-6">
          <div className="w-12 h-12 bg-success/10 text-success rounded-2xl flex items-center justify-center mx-auto border border-success/30">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-primary">Weekly Review Completed</h2>
          <p className="font-sans text-xs text-secondary leading-relaxed">
            Your goals and focus vectors have been successfully registered. Integrities restored for next week.
          </p>
          <div className="border border-border bg-background p-4 text-left space-y-3 text-xs">
            <div>
              <span className="font-label text-[9px] uppercase font-bold text-accent block">Project Focus:</span>
              <p className="font-sans font-semibold text-primary">{nextWeekFocusProject}</p>
            </div>
            <div>
              <span className="font-label text-[9px] uppercase font-bold text-accent block">Learning Focus:</span>
              <p className="font-sans font-semibold text-primary">{nextWeekFocusLearning}</p>
            </div>
          </div>
          <div className="pt-4">
            <Link
              href="/review"
              className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 py-2.5 text-center font-label text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-[0_10px_24px_rgba(26,28,30,0.08)] transition-all hover:opacity-95"
            >
              Return to Review Room
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <ReviewFlowShell
      title="Weekly Review Room"
      subtitle="Verify backlog, inspect active sectors, and declare next targets"
      steps={STEPS}
      currentStep={currentStep}
      onNext={handleStepNext}
      onPrev={handleStepPrev}
      onComplete={handleCompleteReview}
      isCompleteDisabled={!nextWeekFocusProject.trim() || !nextWeekFocusLearning.trim()}
    >
      {/* STEP 1: CLEAR INBOX */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Intake Backlog</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Clear unprocessed captures older than 24 hours. Keep the intake desk clean.
            </p>
          </div>

          {staleInboxItems.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {staleInboxItems.map(item => (
                <div key={item.id} className="app-panel-subtle p-3 flex justify-between items-center text-xs">
                  <div className="min-w-0">
                    <span className="font-sans font-bold text-primary block truncate">{item.title}</span>
                    <span className="font-label text-[8px] text-secondary uppercase block mt-0.5">Age: {Math.round((new Date().getTime() - new Date(item.created_at).getTime()) / (24 * 60 * 60 * 1000))}d</span>
                  </div>
                  <div className="flex gap-1 shrink-0 font-label text-[8px] font-bold">
                    <SecondaryButton
                      type="button"
                      onClick={() => handleProcessItem(item.id, 'processed')}
                      className="min-h-8 px-2 py-1 text-[8px]"
                    >
                      TRIAGE
                    </SecondaryButton>
                    <PrimaryButton
                      type="button"
                      variant="danger"
                      onClick={() => handleProcessItem(item.id, 'archived')}
                      className="min-h-8 px-2 py-1 text-[8px] shadow-none"
                    >
                      ARCHIVE
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Backlog is clear."
              description="There are no stale inbox items older than 24 hours."
            />
          )}
        </div>
      )}

      {/* STEP 2: REVIEW KNOWLEDGE */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Knowledge Created This Week</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Verify notes and study vectors created during the last 7 days.
            </p>
          </div>

          {knowledgeThisWeek.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeThisWeek.map(note => (
                <div key={note.id} className="border border-border bg-background p-4 space-y-1">
                  <span className="font-sans font-bold text-xs text-primary block">{note.title}</span>
                  {note.topic && <span className="font-label text-[9px] text-secondary uppercase block">Topic: {note.topic}</span>}
                  {note.summary && <p className="font-sans text-[11px] text-secondary mt-1 line-clamp-2">{note.summary}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-secondary italic">No new knowledge items cataloged this week.</p>
          )}
        </div>
      )}

      {/* STEP 3: REVIEW PROJECTS */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Project Cockpit Review</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Verify active projects needing focus or next actions.
            </p>
          </div>

          <div className="space-y-3">
            {activeProjects.map(project => {
              const noAction = projectsNoAction.some(p => p.id === project.id);
              return (
                <div key={project.id} className="border border-border bg-background p-4 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="font-sans font-bold text-primary block">{project.name}</span>
                    <span className="font-label text-[9px] text-secondary uppercase block">{project.area}</span>
                  </div>
                  <div>
                    {noAction ? (
                      <span className="font-label text-[9px] uppercase font-bold text-danger border border-danger/25 bg-danger/5 px-2 py-0.5">No Next Action</span>
                    ) : (
                      <span className="font-label text-[9px] uppercase font-bold text-success border border-success/25 bg-success/5 px-2 py-0.5">Active</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW TASKS */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Overdue and Captured Tasks</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Inspect tasks requiring adjustment. Reschedule or triage them.
            </p>
          </div>

          {overdueTasks.length > 0 ? (
            <div className="space-y-3">
              {overdueTasks.map(task => (
                <div key={task.id} className="border border-border bg-background p-3 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="font-sans font-bold text-primary block">{task.name}</span>
                    <span className="font-label text-[8px] text-danger uppercase block">Overdue: {new Date(task.due_date!).toLocaleDateString()}</span>
                  </div>
                  <SecondaryButton
                    type="button"
                    onClick={() => updateTaskStatus(task.id, 'done')}
                    className="min-h-8 px-3 py-1 text-[8px]"
                  >
                    RESOLVED
                  </SecondaryButton>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No overdue active tasks."
              description="There are no overdue tasks that still need weekly review attention."
            />
          )}
        </div>
      )}

      {/* STEP 5: NEXT WEEK FOCUS */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Choose Next Week's Vectors</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Establish core focus dimensions for next week.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="focusProj" className="font-label text-xs uppercase font-bold text-secondary">Main Project Focus (Required)</label>
              <Input
                id="focusProj"
                type="text"
                value={nextWeekFocusProject}
                onChange={(e) => setNextWeekFocusProject(e.target.value)}
                placeholder="The project I will advance next week is..."
                className="bg-neutral-bg text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="focusLearn" className="font-label text-xs uppercase font-bold text-secondary">Main Learning focus (Required)</label>
              <Input
                id="focusLearn"
                type="text"
                value={nextWeekFocusLearning}
                onChange={(e) => setNextWeekFocusLearning(e.target.value)}
                placeholder="Topic or course material I will prioritize..."
                className="bg-neutral-bg text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="focusHabit" className="font-label text-xs uppercase font-bold text-secondary">Habit / System Focus</label>
              <Input
                id="focusHabit"
                type="text"
                value={nextWeekFocusHabit}
                onChange={(e) => setNextWeekFocusHabit(e.target.value)}
                placeholder="Habit or routine to optimize next week..."
                className="bg-neutral-bg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: WEEKLY SUMMARY */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-primary">Reflections Summary</h3>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Consolidate notes on challenges, successes, or adjustments.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="weeklyNotes" className="font-label text-xs uppercase font-bold text-secondary">Weekly Summary Notes</label>
              <Textarea
                id="weeklyNotes"
                value={weeklyNotes}
                onChange={(e) => setWeeklyNotes(e.target.value)}
                placeholder="Key takeaways from this week, pivots, or observations..."
                className="bg-neutral-bg text-sm resize-none min-h-[160px]"
                rows={5}
              />
            </div>
          </div>
        </div>
      )}
    </ReviewFlowShell>
  );
}
