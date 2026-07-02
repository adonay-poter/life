'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import StalenessSignalBadge from '@/components/ui/StalenessSignalBadge';
import {
  Coffee,
  Moon,
  Calendar,
  CheckCircle,
  Clock,
  Archive,
  ArrowRight,
  TrendingUp,
  FileQuestion,
  Sparkles,
  Inbox,
  FolderKanban,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';

export default function ReviewRoom() {
  const {
    computedQueueItems,
    resolveQueueItem,
    snoozeQueueItem,
    inboxItems,
    tasks,
    projects,
    updateInboxItemStatus,
    updateTaskStatus
  } = useDashboard();

  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<string>('all');
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

  // Grouped items counts
  const totalCount = computedQueueItems.length;

  const filteredItems = computedQueueItems.filter(item => {
    if (filterType === 'all') return true;
    return item.item_type === filterType;
  });

  const handleResolve = async (itemId: string, itemType: string) => {
    try {
      // Perform database resolution if it was a system object
      if (itemType === 'inbox_item') {
        await updateInboxItemStatus(itemId, 'processed');
      } else if (itemType === 'task') {
        await updateTaskStatus(itemId, 'done');
      }
      
      // Resolve inside Review Queue
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
      case 'inbox_item': return <Inbox className="h-4 w-4 text-primary" />;
      case 'project': return <FolderKanban className="h-4 w-4 text-accent" />;
      case 'task': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'question': return <FileQuestion className="h-4 w-4 text-danger" />;
      case 'knowledge': return <GraduationCap className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-secondary" />;
    }
  };

  return (
    <PageShell>
      <SectionHeader
        title="Review Room"
        subtitle="Command center for reflecting, triaging backlog, and closing open loops"
      />

      {/* RITUAL FLOW TRIGGERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="border border-border bg-surface p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Coffee className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold text-primary">Midday Review</h3>
            </div>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Process morning captures and declare your focus for the rest of today. A 5-minute mid-day course correction.
            </p>
          </div>
          <Link
            href="/review/midday"
            className="w-full text-center bg-accent text-on-accent hover:opacity-90 transition-all font-label text-xs uppercase tracking-wider py-2.5 font-bold cursor-pointer inline-block"
          >
            Start Midday Checkpoint
          </Link>
        </div>

        <div className="border border-border bg-surface p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold text-primary">Evening Review</h3>
            </div>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Synthesize what you learned, review completed output, log reflections, and select what tomorrow inherits.
            </p>
          </div>
          <Link
            href="/review/evening"
            className="w-full text-center border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all font-label text-xs uppercase tracking-wider py-2.5 font-bold cursor-pointer inline-block"
          >
            Close the Day
          </Link>
        </div>

        <div className="border border-border bg-surface p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold text-primary">Weekly Review Room</h3>
            </div>
            <p className="font-sans text-xs text-secondary leading-relaxed">
              Keep LifeOS from decaying: clear inbox backlog, inspect project status, review weekly learnings, and set next week's core focus.
            </p>
          </div>
          <Link
            href="/review/weekly"
            className="w-full text-center border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all font-label text-xs uppercase tracking-wider py-2.5 font-bold cursor-pointer inline-block"
          >
            Enter Weekly Room
          </Link>
        </div>

      </div>

      {/* REVIEW TRIAGE QUEUE */}
      <EditorialCard
        title={`Triage & Decision Queue (${totalCount})`}
        subtitle="Muted signals requiring a structured decision"
      >
        <div className="space-y-6">
          
          {/* Filters strip */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4 font-label text-[10px] uppercase font-bold">
            {[
              { type: 'all', label: 'All Items' },
              { type: 'inbox_item', label: 'Inbox' },
              { type: 'project', label: 'Projects' },
              { type: 'task', label: 'Tasks' },
              { type: 'question', label: 'Questions' },
              { type: 'knowledge', label: 'Knowledge' }
            ].map(filter => (
              <button
                key={filter.type}
                onClick={() => setFilterType(filter.type)}
                className={`px-3 py-1.5 border transition-all rounded-none cursor-pointer ${
                  filterType === filter.type
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-background text-secondary border-border hover:border-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Queue Items List */}
          {filteredItems.length > 0 ? (
            <div className="divide-y divide-border/60">
              {filteredItems.map(item => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="mt-1 p-1 bg-background border border-border shrink-0">
                      {getIcon(item.item_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-sans font-bold text-xs text-primary truncate">{item.title}</span>
                        <StalenessSignalBadge severity={item.severity} />
                      </div>
                      <p className="font-sans text-[11px] text-danger mt-1 italic leading-relaxed">{item.reason}</p>
                      {item.suggested_action && (
                        <p className="font-sans text-[10px] text-secondary mt-0.5">Recommendation: {item.suggested_action}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto font-label text-[9px] font-bold">
                    
                    {/* Resolve button */}
                    <button
                      onClick={() => handleResolve(item.item_id, item.item_type)}
                      className="bg-primary text-on-primary px-3 py-1.5 uppercase hover:opacity-90 transition-all cursor-pointer"
                    >
                      Resolve
                    </button>

                    {/* Snooze control */}
                    {snoozeTargetId !== item.id ? (
                      <button
                        onClick={() => setSnoozeTargetId(item.id)}
                        className="border border-border text-secondary bg-surface px-3 py-1.5 uppercase hover:bg-neutral-bg transition-all cursor-pointer"
                      >
                        Snooze
                      </button>
                    ) : (
                      <div className="flex border border-border divide-x divide-border bg-surface">
                        <button
                          onClick={() => handleSnooze(item.item_id, item.item_type, 1)}
                          className="px-2 py-1.5 text-primary hover:bg-neutral-bg cursor-pointer"
                        >
                          1d
                        </button>
                        <button
                          onClick={() => handleSnooze(item.item_id, item.item_type, 3)}
                          className="px-2 py-1.5 text-primary hover:bg-neutral-bg cursor-pointer"
                        >
                          3d
                        </button>
                        <button
                          onClick={() => handleSnooze(item.item_id, item.item_type, 7)}
                          className="px-2 py-1.5 text-primary hover:bg-neutral-bg cursor-pointer"
                        >
                          1w
                        </button>
                        <button
                          onClick={() => setSnoozeTargetId(null)}
                          className="px-2 py-1.5 text-danger hover:bg-neutral-bg cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    )}
                    
                    {/* Source navigation link */}
                    {item.item_type === 'inbox_item' && (
                      <Link
                        href="/inbox"
                        className="border border-border text-primary bg-surface px-3 py-1.5 uppercase hover:bg-neutral-bg transition-all flex items-center gap-0.5"
                      >
                        <span>Triage</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    {item.item_type === 'project' && (
                      <Link
                        href={`/projects?projectId=${item.item_id}`}
                        className="border border-border text-primary bg-surface px-3 py-1.5 uppercase hover:bg-neutral-bg transition-all flex items-center gap-0.5"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border bg-background/30">
              <p className="font-sans text-xs text-secondary italic">Nothing needs a decision right now.</p>
            </div>
          )}

        </div>
      </EditorialCard>
    </PageShell>
  );
}
