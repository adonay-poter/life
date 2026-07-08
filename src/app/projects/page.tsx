'use client';

import React, { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  CalendarDays,
  FolderKanban,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

import { useDashboard, Project, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton, IconButton } from '@/components/ui/Buttons';
import { Input, Select, Textarea } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: 'var(--primary)' },
  { name: 'Sage', value: '#58805F' },
  { name: 'Ochre', value: '#D1A153' },
  { name: 'Bronze', value: '#8D6E63' },
];

const AREA_OPTIONS: Array<{ value: 'All' | Project['area']; label: string }> = [
  { value: 'All', label: 'All Areas' },
  { value: 'Business', label: 'Business' },
  { value: 'Health', label: 'Health' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS: Array<{ value: 'All' | NonNullable<Project['status']>; label: string }> = [
  { value: 'All', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'health', label: 'Health First' },
  { value: 'deadline', label: 'Nearest Deadline' },
  { value: 'progress', label: 'Most Progress' },
  { value: 'recent', label: 'Recent Activity' },
  { value: 'alphabetical', label: 'Alphabetical' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];
type ProjectHealth = 'at-risk' | 'steady' | 'winning';

interface ProjectInsight {
  project: Project;
  progress: number;
  openTaskCount: number;
  overdueTaskCount: number;
  nextTaskName: string | null;
  queueSignalCount: number;
  health: ProjectHealth;
  deadlineTime: number | null;
  lastActivityAt: number;
}

function getDaysUntil(value?: string) {
  if (!value) return null;
  const due = new Date(value);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgress(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  const weights = { high: 3, medium: 2, low: 1 };
  let total = 0;
  let done = 0;

  tasks.forEach((task) => {
    const weight = weights[task.priority] ?? 1;
    total += weight;
    if (task.status === 'done') {
      done += weight;
    }
  });

  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function getTaskTimestamp(task: Task) {
  const values = [task.completed_at, task.due_date, task.created_at]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime());
  return values.length ? Math.max(...values) : 0;
}

function getHealthTone(health: ProjectHealth) {
  if (health === 'winning') return 'border-success/30 bg-success/8 text-success';
  if (health === 'at-risk') return 'border-danger/30 bg-danger/8 text-danger';
  return 'border-border bg-background text-primary';
}

function getHealthLabel(health: ProjectHealth) {
  if (health === 'winning') return 'On track';
  if (health === 'at-risk') return 'Needs attention';
  return 'Steady';
}

function ProjectCard({
  insight,
  isTarget,
  onTriggerDelete,
}: {
  insight: ProjectInsight;
  isTarget: boolean;
  onTriggerDelete: (id: string, name: string) => void;
}) {
  const { project, progress, openTaskCount, overdueTaskCount, nextTaskName, queueSignalCount, health } = insight;
  const { archiveProject } = useDashboard();
  const { showToast } = useToast();

  const deadlineOffset = getDaysUntil(project.deadline);
  const deadlineLabel = deadlineOffset === null
    ? 'No deadline'
    : deadlineOffset < 0
      ? `${Math.abs(deadlineOffset)}d overdue`
      : deadlineOffset === 0
        ? 'Due today'
        : `${deadlineOffset}d left`;

  return (
    <article
      id={`project-card-${project.id}`}
      className={`app-panel group relative overflow-hidden transition-all duration-200 hover:border-primary hover:shadow-[0_18px_40px_rgba(26,28,30,0.06)] ${
        isTarget ? 'ring-1 ring-accent border-accent/40' : ''
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: project.color || 'var(--accent)' }}
      />

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-[11px] uppercase tracking-[0.22em] text-secondary">{project.area}</span>
              <StatusBadge status={project.status || 'active'} type="status" />
              <span className={`border px-2 py-1 font-label text-[10px] uppercase tracking-[0.18em] ${getHealthTone(health)}`}>
                {getHealthLabel(health)}
              </span>
            </div>

            <Link href={`/projects/${project.id}`} className="block">
              <h3 className="font-display text-xl leading-tight text-primary transition-colors group-hover:text-accent sm:text-2xl">
                {project.name}
              </h3>
            </Link>

            {project.description && (
              <p className="max-w-xl text-sm leading-relaxed text-secondary line-clamp-1 sm:line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              title={project.is_archived ? 'Unarchive project' : 'Archive project'}
              onClick={async () => {
                const nextArchived = !project.is_archived;
                await archiveProject(project.id, nextArchived);
                showToast(nextArchived ? 'Project archived successfully.' : 'Project restored successfully.', 'success');
              }}
            >
              <Archive className={`h-4 w-4 ${project.is_archived ? 'text-accent' : ''}`} />
            </IconButton>
            <IconButton title="Delete project" onClick={() => onTriggerDelete(project.id, project.name)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="space-y-3 border-y border-border py-3">
          <div className="flex items-center gap-3">
            <span className="w-12 shrink-0 font-display text-2xl text-primary">{progress}%</span>
            <div className="h-2 flex-1 rounded-full bg-secondary/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: project.color || 'var(--accent)' }}
              />
            </div>
            <span className="shrink-0 font-label text-[11px] uppercase tracking-[0.16em] text-secondary">{openTaskCount} open</span>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">Deadline</p>
              <p className="mt-1 font-medium text-primary">{formatDate(project.deadline)}</p>
              <p className={`text-xs uppercase tracking-[0.16em] ${deadlineOffset !== null && deadlineOffset < 0 ? 'text-danger' : 'text-secondary'}`}>
                {deadlineLabel}
              </p>
            </div>

            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">Next</p>
              <p className="mt-1 font-medium text-primary line-clamp-2">
                {nextTaskName || 'Define the next action.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-secondary">
            {overdueTaskCount > 0 && (
              <span className="inline-flex items-center gap-1 text-danger">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueTaskCount} overdue
              </span>
            )}
            {queueSignalCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {queueSignalCount} review signal{queueSignalCount === 1 ? '' : 's'}
              </span>
            )}
            {!overdueTaskCount && !queueSignalCount && (
              <span>Quiet portfolio state</span>
            )}
          </div>

          <Link href={`/projects/${project.id}`} className="w-full sm:w-auto">
            <PrimaryButton type="button" className="w-full sm:min-w-[150px]">
              <ArrowUpRight className="h-4 w-4" />
              Open Project
            </PrimaryButton>
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProjectsContent() {
  const {
    projects,
    tasks,
    computedQueueItems,
    addProject,
    deleteProject,
  } = useDashboard();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const targetProjectId = searchParams ? searchParams.get('projectId') : null;

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<'All' | Project['area']>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | NonNullable<Project['status']>>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('health');
  const [showAddProject, setShowAddProject] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const [newProjArea, setNewProjArea] = useState<Project['area']>('Business');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjGain, setNewProjGain] = useState('');
  const [newProjStartDate, setNewProjStartDate] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjStatus, setNewProjStatus] = useState<Project['status']>('active');
  const [newProjColor, setNewProjColor] = useState('#B8422E');

  const insights = useMemo<ProjectInsight[]>(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id);
      const openTasks = projectTasks.filter((task) => task.status !== 'done');
      const overdueTaskCount = openTasks.filter((task) => {
        const diff = getDaysUntil(task.due_date);
        return diff !== null && diff < 0;
      }).length;

      const nextTask = [...openTasks].sort((left, right) => {
        const priorityRank = { high: 0, medium: 1, low: 2 };
        const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
        if (priorityDelta !== 0) return priorityDelta;

        if (left.due_date && right.due_date) {
          return new Date(left.due_date).getTime() - new Date(right.due_date).getTime();
        }
        if (left.due_date) return -1;
        if (right.due_date) return 1;
        return 0;
      })[0] || null;

      const progress = getProgress(projectTasks);
      const deadlineOffset = getDaysUntil(project.deadline);
      const queueSignalCount = computedQueueItems.filter((item) => item.item_id === project.id).length;
      const stale = computedQueueItems.some((item) => item.item_id === project.id && item.item_type === 'project' && item.reason.includes('progress'));

      let health: ProjectHealth = 'steady';
      if (project.status === 'completed' || (progress >= 80 && overdueTaskCount === 0)) {
        health = 'winning';
      } else if ((deadlineOffset !== null && deadlineOffset < 0) || overdueTaskCount > 0 || stale || queueSignalCount > 0) {
        health = 'at-risk';
      }

      const lastActivityAt = Math.max(
        ...projectTasks.map(getTaskTimestamp),
        project.created_at ? new Date(project.created_at).getTime() : 0
      );

      return {
        project,
        progress,
        openTaskCount: openTasks.length,
        overdueTaskCount,
        nextTaskName: nextTask?.name || null,
        queueSignalCount,
        health,
        deadlineTime: project.deadline ? new Date(project.deadline).getTime() : null,
        lastActivityAt,
      };
    });
  }, [computedQueueItems, projects, tasks]);

  const filteredInsights = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    const filtered = insights.filter((insight) => {
      const status = insight.project.status || 'active';
      const matchesArchive = (insight.project.is_archived || false) === showArchived;
      const matchesArea = selectedAreaFilter === 'All' || insight.project.area === selectedAreaFilter;
      const matchesStatus = selectedStatusFilter === 'All' || status === selectedStatusFilter;
      const matchesSearch = !query || [
        insight.project.name,
        insight.project.description,
        insight.project.client,
        insight.project.gain,
        insight.nextTaskName,
      ].filter(Boolean).some((value) => (value as string).toLowerCase().includes(query));

      return matchesArchive && matchesArea && matchesStatus && matchesSearch;
    });

    return filtered.sort((left, right) => {
      if (sortBy === 'alphabetical') return left.project.name.localeCompare(right.project.name);
      if (sortBy === 'deadline') return (left.deadlineTime ?? Number.MAX_SAFE_INTEGER) - (right.deadlineTime ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === 'progress') return right.progress - left.progress;
      if (sortBy === 'recent') return right.lastActivityAt - left.lastActivityAt;

      const rank = { 'at-risk': 0, steady: 1, winning: 2 };
      const healthDelta = rank[left.health] - rank[right.health];
      if (healthDelta !== 0) return healthDelta;
      return (left.deadlineTime ?? Number.MAX_SAFE_INTEGER) - (right.deadlineTime ?? Number.MAX_SAFE_INTEGER);
    });
  }, [deferredSearch, insights, selectedAreaFilter, selectedStatusFilter, showArchived, sortBy]);

  useEffect(() => {
    if (!targetProjectId) return;
    const element = document.getElementById(`project-card-${targetProjectId}`);
    if (!element) return;

    const timer = window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [filteredInsights, targetProjectId]);

  const portfolioStats = useMemo(() => {
    const activeInsights = insights.filter((insight) => !insight.project.is_archived);
    const atRiskCount = activeInsights.filter((insight) => insight.health === 'at-risk').length;
    const avgProgress = activeInsights.length
      ? Math.round(activeInsights.reduce((sum, insight) => sum + insight.progress, 0) / activeInsights.length)
      : 0;
    const dueSoonCount = activeInsights.filter((insight) => {
      const diff = getDaysUntil(insight.project.deadline);
      return diff !== null && diff >= 0 && diff <= 7;
    }).length;

    return {
      activeCount: activeInsights.length,
      atRiskCount,
      avgProgress,
      dueSoonCount,
    };
  }, [insights]);

  const handleAddProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjName.trim()) {
      showToast('Project name cannot be empty.', 'error');
      return;
    }

    await addProject(
      newProjArea,
      newProjName,
      newProjDesc || undefined,
      newProjColor,
      newProjClient || undefined,
      newProjGain || undefined,
      newProjDeadline || undefined,
      newProjStatus,
      newProjStartDate || undefined
    );

    showToast('Project initiated successfully.', 'success');
    setNewProjName('');
    setNewProjDesc('');
    setNewProjClient('');
    setNewProjGain('');
    setNewProjStartDate('');
    setNewProjDeadline('');
    setNewProjStatus('active');
    setNewProjColor('#B8422E');
    setShowAddProject(false);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedAreaFilter('All');
    setSelectedStatusFilter('All');
    setSortBy('health');
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <SectionHeader
        title="Projects"
        subtitle="Active work, next actions, and deadlines"
        meta={`${projects.length} total`}
        action={
          <PrimaryButton type="button" onClick={() => setShowAddProject((value) => !value)}>
            <Plus className="h-4 w-4" />
            {showAddProject ? 'Close' : 'New Project'}
          </PrimaryButton>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="app-panel p-3">
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">Active</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="app-metric text-3xl text-primary">{portfolioStats.activeCount}</span>
            <FolderKanban className="h-5 w-5 text-secondary" />
          </div>
        </div>
        <div className="app-panel p-3">
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">At Risk</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className={`app-metric text-3xl ${portfolioStats.atRiskCount > 0 ? 'text-danger' : 'text-primary'}`}>{portfolioStats.atRiskCount}</span>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
        </div>
        <div className="app-panel p-3">
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">Progress</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="app-metric text-3xl text-primary">{portfolioStats.avgProgress}%</span>
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
        </div>
        <div className="app-panel p-3">
          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary">Due Soon</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="app-metric text-3xl text-primary">{portfolioStats.dueSoonCount}</span>
            <CalendarDays className="h-5 w-5 text-secondary" />
          </div>
        </div>
      </section>

      {showAddProject && (
        <section className="app-panel p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <p className="font-label text-[11px] uppercase tracking-[0.24em] text-secondary">New Project</p>
              <h2 className="font-display text-2xl text-primary">Create an initiative</h2>
            </div>
            <IconButton title="Close form" onClick={() => setShowAddProject(false)}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <form onSubmit={handleAddProject} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Select
                label="Area"
                value={newProjArea}
                onChange={(event) => setNewProjArea(event.target.value as Project['area'])}
                options={AREA_OPTIONS.filter((option) => option.value !== 'All').map((option) => ({ value: option.value, label: option.label }))}
              />
              <Select
                label="Status"
                value={newProjStatus}
                onChange={(event) => setNewProjStatus(event.target.value as Project['status'])}
                options={STATUS_OPTIONS.filter((option) => option.value !== 'All').map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>

            <div className="space-y-2">
              <span className="block font-label text-xs font-bold uppercase tracking-wider text-secondary">Accent</span>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewProjColor(color.value)}
                    className={`h-9 w-9 rounded-xl border transition-transform btn-press ${
                      newProjColor === color.value ? 'scale-110 border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Input label="Project Name" value={newProjName} onChange={(event) => setNewProjName(event.target.value)} required />
              <Input label="Client / Audience" value={newProjClient} onChange={(event) => setNewProjClient(event.target.value)} />
            </div>

            <Textarea label="Description" value={newProjDesc} onChange={(event) => setNewProjDesc(event.target.value)} rows={4} className="min-h-[120px]" />

            <div className="grid gap-4 lg:grid-cols-3">
              <Input label="Payoff / Gain" value={newProjGain} onChange={(event) => setNewProjGain(event.target.value)} />
              <Input label="Start Date" type="date" value={newProjStartDate} onChange={(event) => setNewProjStartDate(event.target.value)} />
              <Input label="Deadline" type="date" value={newProjDeadline} onChange={(event) => setNewProjDeadline(event.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">
                <Plus className="h-4 w-4" />
                Save Project
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setShowAddProject(false)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
          <div className="app-panel p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
              <Input
                aria-label="Search projects"
                className="pl-9"
                placeholder="Search projects or next actions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <Select
                label="Area"
                value={selectedAreaFilter}
                onChange={(event) => setSelectedAreaFilter(event.target.value as 'All' | Project['area'])}
                options={AREA_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <Select
                label="Status"
                value={selectedStatusFilter}
                onChange={(event) => setSelectedStatusFilter(event.target.value as 'All' | NonNullable<Project['status']>)}
                options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <Select
                label="Sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <SecondaryButton type="button" onClick={clearFilters} className="self-end">
                Reset
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => setShowArchived((value) => !value)} className="self-end">
                {showArchived ? 'Show Active' : 'Show Archived'}
              </SecondaryButton>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label text-[11px] uppercase tracking-[0.24em] text-secondary">
                {showArchived ? 'Archived Projects' : 'Active Projects'}
              </p>
              <h2 className="font-display text-2xl text-primary">
                {filteredInsights.length} project{filteredInsights.length === 1 ? '' : 's'}
              </h2>
            </div>
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-secondary">
              Sorted by {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </p>
          </div>

          {filteredInsights.length > 0 ? (
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <ProjectCard
                  key={insight.project.id}
                  insight={insight}
                  isTarget={targetProjectId === insight.project.id}
                  onTriggerDelete={(id, name) => {
                    setProjectToDelete({ id, name });
                    setDeleteModalOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={showArchived ? 'No archived projects match' : 'No projects match your filters'}
              description={showArchived
                ? 'Switch back to active work or clear the filters.'
                : 'Adjust the current filters or create a new project.'}
              action={
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton type="button" onClick={clearFilters}>Clear Filters</SecondaryButton>
                  {!showArchived && (
                    <PrimaryButton type="button" onClick={() => setShowAddProject(true)}>
                      <Plus className="h-4 w-4" />
                      New Project
                    </PrimaryButton>
                  )}
                </div>
              }
            />
          )}
      </section>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={async () => {
          if (!projectToDelete) return;
          await deleteProject(projectToDelete.id);
          showToast('Project deleted successfully.', 'info');
        }}
        itemName={projectToDelete?.name || ''}
        itemType="project"
      />
    </PageShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="app-panel py-16 text-center">
          <p className="font-sans text-sm italic text-secondary">Loading projects workspace...</p>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
