'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Coffee,
  FileQuestion,
  FolderKanban,
  GraduationCap,
  Inbox,
  Moon,
  Sparkles,
} from 'lucide-react';

import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import EmptyState from '@/components/ui/EmptyState';
import StalenessSignalBadge from '@/components/ui/StalenessSignalBadge';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';

const FILTER_OPTIONS = [
  { type: 'all', label: 'All' },
  { type: 'inbox_item', label: 'Inbox' },
  { type: 'project', label: 'Projects' },
  { type: 'task', label: 'Tasks' },
  { type: 'question', label: 'Questions' },
  { type: 'knowledge', label: 'Knowledge' },
] as const;

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 Days', days: 3 },
  { label: 'Next Week', days: 7 },
] as const;

export default function ReviewRoom() {
  const {
    computedQueueItems,
    resolveQueueItem,
    snoozeQueueItem,
    updateInboxItemStatus,
    updateTaskStatus,
  } = useDashboard();

  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<string>('all');
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

  const totalCount = computedQueueItems.length;

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return computedQueueItems;
    return computedQueueItems.filter((item) => item.item_type === filterType);
  }, [computedQueueItems, filterType]);

  const reviewStats = useMemo(() => {
    const high = computedQueueItems.filter((item) => item.severity === 'high').length;
    const inbox = computedQueueItems.filter((item) => item.item_type === 'inbox_item').length;
    const project = computedQueueItems.filter((item) => item.item_type === 'project').length;
    const stale = computedQueueItems.filter((item) => item.severity !== 'low').length;

    return { high, inbox, project, stale };
  }, [computedQueueItems]);

  const ritualCards = [
    {
      title: 'Midday Review',
      description: 'Re-center the day, process fresh captures, and declare the one thing that still matters.',
      href: '/review/midday',
      cta: 'Start Checkpoint',
      icon: Coffee,
      accent: 'Today',
      tone: 'text-accent',
      solid: true,
    },
    {
      title: 'Evening Review',
      description: 'Close loops, log what changed, and decide what tomorrow should inherit.',
      href: '/review/evening',
      cta: 'Close the Day',
      icon: Moon,
      accent: 'Reset',
      tone: 'text-primary',
      solid: false,
    },
    {
      title: 'Weekly Review',
      description: 'Inspect backlog, project health, and learning momentum before the next week begins.',
      href: '/review/weekly',
      cta: 'Enter Weekly Room',
      icon: Calendar,
      accent: 'Weekly',
      tone: 'text-primary',
      solid: false,
    },
  ] as const;

  const handleResolve = async (itemId: string, itemType: string) => {
    try {
      if (itemType === 'inbox_item') {
        await updateInboxItemStatus(itemId, 'processed');
      } else if (itemType === 'task') {
        await updateTaskStatus(itemId, 'done');
      }

      await resolveQueueItem(itemId, itemType);
      showToast('Item resolved and loop closed.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to resolve item.', 'error');
    }
  };

  const handleSnooze = async (itemId: string, itemType: string, days: number) => {
    try {
      const snoozeDate = new Date();
      snoozeDate.setDate(snoozeDate.getDate() + days);
      const snoozeDateStr = getLocalDateString(snoozeDate);

      await snoozeQueueItem(itemId, itemType, snoozeDateStr);
      setSnoozeTargetId(null);
      showToast(`Item snoozed until ${snoozeDateStr}.`, 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to snooze item.', 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'inbox_item':
        return <Inbox className="h-4 w-4 text-primary" />;
      case 'project':
        return <FolderKanban className="h-4 w-4 text-accent" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'question':
        return <FileQuestion className="h-4 w-4 text-danger" />;
      case 'knowledge':
        return <GraduationCap className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-secondary" />;
    }
  };

  const getPrimaryLink = (itemType: string, itemId: string) => {
    if (itemType === 'inbox_item') {
      return { href: '/inbox', label: 'Open Inbox' };
    }
    if (itemType === 'project') {
      return { href: `/projects?projectId=${itemId}`, label: 'Open Project' };
    }
    if (itemType === 'task') {
      return { href: '/tasks?tab=today', label: 'Open Tasks' };
    }
    if (itemType === 'knowledge' || itemType === 'question') {
      return { href: '/intelligence', label: 'Review Context' };
    }
    return { href: '/review', label: 'Inspect' };
  };

  return (
    <PageShell>
      <SectionHeader
        title="Review Room"
        subtitle="Keep captures, tasks, and projects from decaying into background noise."
        meta={`${totalCount} open loop${totalCount === 1 ? '' : 's'}`}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {ritualCards.map((ritual) => {
          const Icon = ritual.icon;

          return (
            <article
              key={ritual.title}
              className="app-panel flex h-full flex-col justify-between gap-5 px-5 py-5 sm:px-6"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="app-panel-subtle flex h-12 w-12 items-center justify-center rounded-2xl">
                    <Icon className={`h-5 w-5 ${ritual.tone}`} />
                  </div>
                  <span className="app-kicker">{ritual.accent}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl leading-tight text-primary">{ritual.title}</h3>
                  <p className="text-sm leading-relaxed text-secondary">{ritual.description}</p>
                </div>
              </div>

              <Link href={ritual.href} className="w-full">
                {ritual.solid ? (
                  <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 font-label text-xs font-bold uppercase tracking-[0.18em] text-on-accent shadow-[0_14px_28px_rgba(184,66,46,0.2)] transition-all">
                    {ritual.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 font-label text-xs font-bold uppercase tracking-[0.18em] text-primary transition-all hover:border-primary hover:bg-surface-muted">
                    {ritual.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Link>
            </article>
          );
        })}
      </section>

      <section className="app-panel overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Need Action', value: reviewStats.high, detail: 'high urgency', icon: Sparkles, tone: reviewStats.high > 0 ? 'text-accent' : 'text-primary' },
            { label: 'Inbox Loops', value: reviewStats.inbox, detail: 'capture backlog', icon: Inbox, tone: reviewStats.inbox > 0 ? 'text-primary' : 'text-secondary' },
            { label: 'Project Signals', value: reviewStats.project, detail: 'watch progress', icon: FolderKanban, tone: reviewStats.project > 0 ? 'text-primary' : 'text-secondary' },
            { label: 'Stale Items', value: reviewStats.stale, detail: 'medium or high', icon: Clock, tone: reviewStats.stale > 0 ? 'text-warning' : 'text-secondary' },
          ].map((metric, index) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className={`flex min-h-32 flex-col justify-between p-4 sm:p-5 ${
                  index % 2 === 0 ? 'border-r border-border md:border-r' : ''
                } ${index < 2 ? 'border-b border-border' : 'md:border-b-0'}`}
              >
                <Icon className={`h-4 w-4 ${metric.tone}`} />
                <div>
                  <div className={`app-metric text-3xl ${metric.tone}`}>{metric.value}</div>
                  <div className="mt-1 font-label text-[10px] uppercase tracking-[0.16em] text-secondary">
                    {metric.label} · {metric.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <EditorialCard
        title="Decision Queue"
        subtitle="Resolve what needs attention now, snooze what should wait, and move the rest to the right workspace."
        action={
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter.type}
                onClick={() => setFilterType(filter.type)}
                className={`rounded-full border px-3 py-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.18em] transition-all ${
                  filterType === filter.type
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        }
      >
        {filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const sourceLink = getPrimaryLink(item.item_type, item.item_id);
              const isSnoozing = snoozeTargetId === item.id;

              return (
                <article
                  key={item.id}
                  className="app-panel-subtle space-y-4 px-4 py-4 sm:px-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="app-panel-subtle mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border-none bg-surface">
                        {getIcon(item.item_type)}
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="app-kicker text-primary">{item.item_type.replace('_', ' ')}</span>
                          <StalenessSignalBadge severity={item.severity} />
                        </div>
                        <h3 className="text-sm font-semibold text-primary sm:text-base">{item.title}</h3>
                        <p className="text-sm leading-relaxed text-danger">{item.reason}</p>
                        {item.suggested_action && (
                          <p className="text-sm leading-relaxed text-secondary">
                            Next move: {item.suggested_action}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="app-kicker shrink-0">
                      Detected {new Date(item.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <PrimaryButton
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={() => handleResolve(item.item_id, item.item_type)}
                      >
                        Resolve
                      </PrimaryButton>
                      <Link href={sourceLink.href} className="w-full sm:w-auto">
                        <SecondaryButton type="button" className="w-full sm:w-auto">
                          {sourceLink.label}
                        </SecondaryButton>
                      </Link>
                      {!isSnoozing && (
                        <SecondaryButton
                          type="button"
                          className="w-full sm:w-auto"
                          onClick={() => setSnoozeTargetId(item.id)}
                        >
                          Snooze
                        </SecondaryButton>
                      )}
                    </div>

                    {isSnoozing && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {SNOOZE_OPTIONS.map((option) => (
                          <SecondaryButton
                            key={option.days}
                            type="button"
                            className="w-full sm:w-auto"
                            onClick={() => handleSnooze(item.item_id, item.item_type, option.days)}
                          >
                            {option.label}
                          </SecondaryButton>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSnoozeTargetId(null)}
                          className="min-h-11 rounded-2xl border border-danger/30 px-4 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.18em] text-danger transition-all hover:bg-danger/5"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Queue is clear"
            description="Nothing needs a structured decision right now. Use the ritual reviews to stay ahead of drift."
            action={
              <Link href="/review/weekly">
                <SecondaryButton type="button">Open Weekly Review</SecondaryButton>
              </Link>
            }
          />
        )}
      </EditorialCard>
    </PageShell>
  );
}
