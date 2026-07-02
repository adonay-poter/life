'use client';

import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import { PrimaryButton } from '@/components/ui/Buttons';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  HelpCircle,
  ArrowRight,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function IntelligenceFeed() {
  const {
    inboxItems,
    tasks,
    projects,
    knowledgeItems,
    dailyDigests,
    upsertDailyDigest,
    addKnowledgeItem,
    addTask,
    journalEntries,
    lessons,
    computedQueueItems,
  } = useDashboard();

  const { showToast } = useToast();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const todayStr = getLocalDateString();

  // Find or compute digest for today
  const todayDigest = useMemo(() => {
    return dailyDigests.find((d) => d.date === todayStr) || null;
  }, [dailyDigests, todayStr]);

  // Today Stats Calculations
  const stats = useMemo(() => {
    const capturesToday = inboxItems.filter(i => i.created_at.split('T')[0] === todayStr).length;
    const processedToday = inboxItems.filter(i => i.processed_at && i.processed_at.split('T')[0] === todayStr).length;
    const notesToday = knowledgeItems.filter(k => k.created_at.split('T')[0] === todayStr).length;
    const tasksToday = tasks.filter(t => t.created_at && t.created_at.split('T')[0] === todayStr).length;
    const lessonsToday = lessons.filter(l => l.completed && l.created_at && l.created_at.split('T')[0] === todayStr).length;
    const journalsToday = journalEntries.filter(j => j.date === todayStr).length;
    const unprocessedRemaining = inboxItems.filter(i => i.status === 'unprocessed' || i.status === 'unsorted').length;

    return {
      capturesToday,
      processedToday,
      notesToday,
      tasksToday,
      lessonsToday,
      journalsToday,
      unprocessedRemaining
    };
  }, [inboxItems, tasks, knowledgeItems, journalEntries, lessons, todayStr]);

  // Dynamic Themes group fallbacks if AI not available
  const computedThemes = useMemo(() => {
    if ((todayDigest as any)?.themes && (todayDigest as any).themes.length > 0) {
      return (todayDigest as any).themes;
    }

    // Deterministic fallback: group items by tags/projects
    const tagGroups: Record<string, string[]> = {};
    inboxItems.forEach(item => {
      item.tags.forEach(tag => {
        const cleanTag = tag.replace('#', '');
        if (!tagGroups[cleanTag]) tagGroups[cleanTag] = [];
        tagGroups[cleanTag].push(item.title);
      });
    });

    return Object.entries(tagGroups)
      .slice(0, 3)
      .map(([theme, items]) => ({
        title: theme.charAt(0).toUpperCase() + theme.slice(1) + ' Cluster',
        summary: `You captured ${items.length} items related to this tag today.`,
        related_item_ids: [],
        suggested_action: `Review and structure your captured material on ${theme}`
      }));
  }, [todayDigest, inboxItems]);

  // Dynamic Open Questions fallbacks
  const computedQuestions = useMemo(() => {
    if (todayDigest?.open_questions && todayDigest.open_questions.length > 0) {
      return todayDigest.open_questions.map((q: any) => typeof q === 'string' ? { question: q, suggested_next_step: 'Explore or create notes' } : q);
    }
    // Pull questions from inbox items
    const questionItems = inboxItems.filter(i => i.type === 'question' && (i.status === 'unprocessed' || i.status === 'unsorted'));
    return questionItems.map(q => ({
      question: q.title,
      suggested_next_step: 'Answer in a knowledge note or research'
    }));
  }, [todayDigest, inboxItems]);

  // Suggested Actions list
  const computedSuggestedActions = useMemo(() => {
    if (todayDigest?.suggested_actions && todayDigest.suggested_actions.length > 0) {
      return todayDigest.suggested_actions;
    }
    // Deterministic suggestions
    const actions = [];
    
    // Suggest Triaging if there are unprocessed items
    const unprocessed = inboxItems.filter(i => i.status === 'unprocessed' || i.status === 'unsorted');
    if (unprocessed.length > 0) {
      actions.push({
        type: 'review',
        title: `Process your ${unprocessed.length} captured slips`,
        reason: 'Unprocessed items build backlog and decay quickly.'
      });
    }

    // Suggest scheduling unscheduled tasks
    const unscheduled = tasks.filter(t => t.status !== 'done' && t.inbox_item_id && !t.due_date);
    if (unscheduled.length > 0) {
      actions.push({
        type: 'task',
        title: `Schedule: "${unscheduled[0].name}"`,
        reason: 'Task created from capture is floating without a calendar date.'
      });
    }

    return actions;
  }, [todayDigest, inboxItems, tasks]);

  // Generate / Refresh intelligence summary via Gemini
  const handleGenerateDigest = async () => {
    setGenerating(true);
    showToast('Consulting LifeOS Intelligence Engine...', 'info');
    try {
      // Collect today's items
      const todayInbox = inboxItems.filter(i => i.created_at.split('T')[0] === todayStr);
      const todayTasks = tasks.filter(t => t.created_at && t.created_at.split('T')[0] === todayStr);
      const todayKnowledge = knowledgeItems.filter(k => k.created_at.split('T')[0] === todayStr);
      const todayJournal = journalEntries.filter(j => j.date === todayStr);

      const res = await fetch('/api/intelligence/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          inboxItems: todayInbox,
          tasks: todayTasks,
          knowledgeItems: todayKnowledge,
          journalEntries: todayJournal
        })
      });

      if (!res.ok) throw new Error('API returned error');
      const data = await res.json();

      // Upsert into database
      await upsertDailyDigest(todayStr, {
        summary: data.summary,
        captured_count: stats.capturesToday,
        processed_count: stats.processedToday,
        knowledge_count: stats.notesToday,
        tasks_created_count: stats.tasksToday,
        journal_entries_count: stats.journalsToday,
        projects_touched_count: projects.filter(p => !p.is_archived).length, // simple metric
        open_questions: data.open_questions.map((q: any) => typeof q === 'string' ? q : q.question),
        important_insights: data.important_insights.map((i: any) => typeof i === 'string' ? i : i.title),
        suggested_actions: data.suggested_actions,
        tomorrow_inherits: data.tomorrow_inherits
      });

      showToast('Intelligence brief generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      // Fallback deterministic save
      await upsertDailyDigest(todayStr, {
        summary: `Today you captured ${stats.capturesToday} items. ${stats.processedToday} became useful, and ${stats.unprocessedRemaining} still need a decision.`,
        captured_count: stats.capturesToday,
        processed_count: stats.processedToday,
        knowledge_count: stats.notesToday,
        tasks_created_count: stats.tasksToday,
        journal_entries_count: stats.journalsToday,
        projects_touched_count: 0,
        open_questions: computedQuestions.map(q => q.question),
        important_insights: ['Captured items are waiting to be structured'],
        suggested_actions: computedSuggestedActions,
        tomorrow_inherits: 'Review outstanding inbox items'
      });
      showToast('Offline brief constructed.', 'info');
    } finally {
      setGenerating(false);
    }
  };

  // Perform Suggested Action
  const handleApproveAction = async (action: any, index: number) => {
    try {
      if (action.type === 'task') {
        await addTask(undefined, action.title, action.reason, 'medium', undefined, 'none', undefined, [], 'Learning');
        showToast('Created implementation task.', 'success');
      } else if (action.type === 'note') {
        await addKnowledgeItem(action.title, action.reason, 'Note', undefined, 'Brief suggestion');
        showToast('Created knowledge note.', 'success');
      } else if (action.type === 'archive') {
        showToast('Archived stale captures.', 'info');
      } else if (action.type === 'review') {
        router.push('/inbox');
        return;
      }
      
      // Remove or mark this action as approved in daily digest
      if (todayDigest) {
        const remainingActions = todayDigest.suggested_actions.filter((_: any, i: number) => i !== index);
        await upsertDailyDigest(todayStr, {
          suggested_actions: remainingActions
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to execute suggestion.', 'error');
    }
  };

  const handleDismissAction = async (index: number) => {
    if (todayDigest) {
      const remainingActions = todayDigest.suggested_actions.filter((_: any, i: number) => i !== index);
      await upsertDailyDigest(todayStr, {
        suggested_actions: remainingActions
      });
      showToast('Suggestion dismissed.', 'info');
    }
  };

  // Filter Needs Review computed queue items
  const urgentReviewItems = computedQueueItems.slice(0, 4);
  const activeProjects = projects.filter((p) => !p.is_archived && p.status !== 'completed' && p.status !== 'cancelled');
  const briefingStats = [
    {
      label: 'Open slips',
      value: stats.unprocessedRemaining,
      detail: 'waiting for structure',
      icon: AlertCircle,
      tone: stats.unprocessedRemaining > 0 ? 'text-accent' : 'text-primary'
    },
    {
      label: 'Suggested actions',
      value: computedSuggestedActions.length,
      detail: 'ready to approve',
      icon: CheckCircle,
      tone: computedSuggestedActions.length > 0 ? 'text-primary' : 'text-secondary'
    },
    {
      label: 'Open questions',
      value: computedQuestions.length,
      detail: 'need research or notes',
      icon: HelpCircle,
      tone: computedQuestions.length > 0 ? 'text-warning' : 'text-primary'
    },
    {
      label: 'Active projects',
      value: activeProjects.length,
      detail: 'current work surface',
      icon: BookOpen,
      tone: 'text-primary'
    }
  ];

  return (
    <PageShell>
      <SectionHeader
        title="Intelligence Brief"
        subtitle="Daily synthesis, unresolved signals, and next actions"
        meta={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
        action={
          <PrimaryButton onClick={handleGenerateDigest} disabled={generating} className="flex items-center gap-1">
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{todayDigest ? 'Refresh Brief' : 'Generate Brief'}</span>
          </PrimaryButton>
        }
      />

      <section className="bg-surface border border-primary">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
          <div className="p-5 md:p-7 border-b xl:border-b-0 xl:border-r border-border">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="font-label text-[10px] bg-accent text-on-accent px-2 py-1 uppercase tracking-wider font-bold">
                Daily Brief
              </span>
              <span className="font-label text-[10px] text-secondary uppercase tracking-[0.16em]">
                {stats.capturesToday} captures today
              </span>
              {stats.unprocessedRemaining > 0 && (
                <span className="font-label text-[10px] text-danger uppercase tracking-[0.16em] font-bold">
                  {stats.unprocessedRemaining} unresolved
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-primary leading-tight max-w-3xl">
              {todayDigest?.summary || 'No synthesis exists yet. Generate a brief to turn today’s captures into an actionable picture.'}
            </h2>
            <p className="font-sans text-sm text-secondary max-w-2xl leading-relaxed mt-4">
              {computedSuggestedActions.length > 0
                ? `${computedSuggestedActions.length} suggested action${computedSuggestedActions.length === 1 ? '' : 's'} are ready for approval, and ${computedQuestions.length} open question${computedQuestions.length === 1 ? '' : 's'} still need resolution.`
                : 'The feed is quiet right now. Capture more material or regenerate the brief after you process today’s work.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 font-label text-xs uppercase tracking-wider font-bold">
              <Link
                href="/inbox"
                className="bg-accent text-on-accent hover:opacity-95 transition-all py-3 px-5 text-center btn-press"
              >
                Open Inbox Queue
              </Link>
              <Link
                href="/review"
                className="border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all py-3 px-5 text-center btn-press"
              >
                Open Review Room
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2">
            {briefingStats.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="min-h-32 border-b border-r border-border even:border-r-0 xl:[&:nth-child(n+3)]:border-b-0 p-4 flex flex-col justify-between">
                  <Icon className={`h-4 w-4 ${metric.tone}`} />
                  <div>
                    <div className={`font-display text-3xl font-bold ${metric.tone}`}>{metric.value}</div>
                    <div className="font-label text-[10px] text-secondary uppercase tracking-[0.16em] mt-1">
                      {metric.label} · {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div className="lg:col-span-8 space-y-6">
          <EditorialCard title="Activity Ledger" subtitle="Today across capture, learning, and execution">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center font-label text-[10px] uppercase font-bold">
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Captured</span>
                <span className="text-sm font-bold text-primary block mt-0.5">{stats.capturesToday}</span>
              </div>
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Processed</span>
                <span className="text-sm font-bold text-success block mt-0.5">{stats.processedToday}</span>
              </div>
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Notes</span>
                <span className="text-sm font-bold text-primary block mt-0.5">{stats.notesToday}</span>
              </div>
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Tasks</span>
                <span className="text-sm font-bold text-primary block mt-0.5">{stats.tasksToday}</span>
              </div>
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Lessons</span>
                <span className="text-sm font-bold text-primary block mt-0.5">{stats.lessonsToday}</span>
              </div>
              <div className="bg-background border border-border p-3">
                <span className="text-secondary block">Journal</span>
                <span className="text-sm font-bold text-primary block mt-0.5">{stats.journalsToday > 0 ? 'Logged' : 'None'}</span>
              </div>
            </div>
          </EditorialCard>

          {/* Themes detected */}
          <EditorialCard title="Detected Themes" subtitle="Signals emerging from today’s material">
            {computedThemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {computedThemes.map((theme: any, i: number) => (
                  <div key={i} className="border border-border bg-background p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="font-label text-xs uppercase font-bold text-primary">{theme.title}</span>
                        {theme.related_item_ids?.length > 0 && (
                          <span className="font-label text-[9px] bg-secondary/15 px-1 py-0.5 uppercase">{theme.related_item_ids.length} items</span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-secondary leading-relaxed mb-4">{theme.summary}</p>
                    </div>
                    {theme.suggested_action && (
                      <div className="border-t border-border/40 pt-2 font-label text-[10px] text-accent flex items-center justify-between">
                        <span>Action: {theme.suggested_action}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary italic">No themes identified yet. Captured context is minimal.</p>
            )}
          </EditorialCard>

          {/* Open Questions */}
          <EditorialCard title="Open Questions" subtitle="Unresolved threads worth turning into work">
            {computedQuestions.length > 0 ? (
              <div className="space-y-3">
                {computedQuestions.map((q, i) => (
                  <div key={i} className="flex justify-between items-start gap-4 p-3 border border-border bg-background">
                    <div className="space-y-1">
                      <p className="font-sans text-xs font-semibold text-primary italic flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{q.question}</span>
                      </p>
                      {q.suggested_next_step && (
                        <p className="font-sans text-[11px] text-secondary pl-4.5">Next step: {q.suggested_next_step}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/tasks?quickAddName=${encodeURIComponent(q.question)}`}
                        className="text-[9px] font-label uppercase font-bold text-accent border border-accent/20 px-2 py-1 bg-accent/5 hover:bg-accent hover:text-on-accent"
                      >
                        Action Plan
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary italic">No open learning inquiries detected today.</p>
            )}
          </EditorialCard>

        </div>

        <div className="lg:col-span-4 space-y-6">
          
          <EditorialCard title="Suggested Actions" subtitle="Approve or dismiss the next move">
            {computedSuggestedActions.length > 0 ? (
              <div className="space-y-3">
                {computedSuggestedActions.map((action, i) => (
                  <div key={i} className="border border-border bg-surface p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <StatusBadge status={action.type} type="priority" />
                    </div>
                    <p className="font-sans text-xs font-bold text-primary">{action.title}</p>
                    <p className="font-sans text-[11px] text-secondary leading-relaxed">{action.reason}</p>
                    
                    <div className="flex gap-2 pt-2 border-t border-border/40">
                      <button
                        onClick={() => handleApproveAction(action, i)}
                        className="flex-1 text-[9px] font-label font-bold uppercase py-1 text-center bg-accent text-on-accent hover:opacity-90 transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDismissAction(i)}
                        className="flex-1 text-[9px] font-label font-bold uppercase py-1 text-center border border-border text-secondary hover:bg-background transition-all cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary italic">All suggestions processed.</p>
            )}
          </EditorialCard>

          <EditorialCard title="Attention Loops" subtitle="Signals already decaying or waiting for review">
            {urgentReviewItems.length > 0 ? (
              <div className="space-y-3">
                {urgentReviewItems.map((item) => (
                  <div key={item.id} className="border border-border bg-background p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-label text-[9px] uppercase font-bold text-accent">{item.item_type}</span>
                      <span className="font-label text-[9px] text-secondary">{new Date(item.detected_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-sans text-xs font-semibold text-primary">{item.title}</p>
                    <p className="font-sans text-[11px] text-danger italic">{item.reason}</p>
                    <div className="pt-2 flex justify-end">
                      <Link
                        href="/review"
                        className="text-[9px] font-label uppercase font-bold text-secondary hover:text-accent flex items-center gap-0.5"
                      >
                        <span>Triage Queue</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-sans text-xs text-secondary italic">All system loops closed and healthy.</p>
              </div>
            )}
          </EditorialCard>

        </div>

      </div>
    </PageShell>
  );
}
