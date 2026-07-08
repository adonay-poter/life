'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Briefcase,
  Calendar,
  Edit3,
  Pin,
  Play,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react';

import { useDashboard, Project, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import PageShell from '@/components/ui/PageShell';
import EditorialCard from '@/components/ui/EditorialCard';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { Input, Textarea, Select } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import StalenessSignalBadge from '@/components/ui/StalenessSignalBadge';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: 'var(--primary)' },
  { name: 'Sage', value: '#58805F' },
  { name: 'Ochre', value: '#D1A153' },
  { name: 'Bronze', value: '#8D6E63' }
];

const AREA_OPTIONS = [
  { value: 'Business', label: 'Business' },
  { value: 'Health', label: 'Health' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Other', label: 'Other' }
];

const PROJECT_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const TASK_CATEGORY_OPTIONS = [
  { value: 'Work', label: 'Work' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Other', label: 'Other' }
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

function ProjectDetailContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { showToast } = useToast();
  const {
    projects,
    tasks,
    inboxItems,
    objectLinks,
    knowledgeItems,
    updateProject,
    archiveProject,
    deleteProject,
    addTask,
    updateTask,
    updateTaskStatus,
    togglePinTask,
    computedQueueItems
  } = useDashboard();

  const project = projects.find((p) => p.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editGain, setEditGain] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('active');
  const [editArea, setEditArea] = useState<Project['area']>('Business');
  const [editColor, setEditColor] = useState('#B8422E');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState<Task['category']>('Work');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Task['priority']>('medium');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [showGuardModal, setShowGuardModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<Project['status'] | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || '');
      setEditClient(project.client || '');
      setEditGain(project.gain || '');
      setEditStartDate(project.start_date ? project.start_date.split('T')[0] : '');
      setEditDeadline(project.deadline ? project.deadline.split('T')[0] : '');
      setEditStatus(project.status || 'active');
      setEditArea(project.area);
      setEditColor(project.color || '#B8422E');
    }
  }, [project]);

  const projectId = project?.id;

  const relatedCaptures = useMemo(() => {
    if (!projectId) return [];
    return inboxItems.filter((item) => item.project_id === projectId);
  }, [inboxItems, projectId]);

  const relatedNoteIds = useMemo(() => {
    if (!projectId) return [];
    return objectLinks
      .filter(
        (link) =>
          link.target_id === projectId &&
          link.target_type === 'project' &&
          link.source_type === 'knowledge_item'
      )
      .map((link) => link.source_id);
  }, [objectLinks, projectId]);

  const relatedNotes = useMemo(() => {
    if (relatedNoteIds.length === 0) return [];
    return knowledgeItems.filter((note) => relatedNoteIds.includes(note.id));
  }, [knowledgeItems, relatedNoteIds]);

  const nextTask = useMemo(() => {
    if (!projectId) return null;
    const pending = tasks.filter((task) => task.project_id === projectId && task.status !== 'done');
    if (pending.length === 0) return null;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...pending].sort((a, b) => {
      const pA = priorityOrder[a.priority] ?? 1;
      const pB = priorityOrder[b.priority] ?? 1;
      if (pA !== pB) return pA - pB;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })[0];
  }, [tasks, projectId]);

  const projTasks = useMemo(() => tasks.filter((task) => task.project_id === projectId), [tasks, projectId]);
  const doneTasks = useMemo(() => projTasks.filter((task) => task.status === 'done'), [projTasks]);
  const pendingTasks = useMemo(() => projTasks.filter((task) => task.status !== 'done'), [projTasks]);

  const weeklyStats = useMemo(() => {
    if (!projectId) return { completedTasks: 0, addedCaptures: 0, addedNotes: 0 };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedTasks = tasks.filter(
      (task) =>
        task.project_id === projectId &&
        task.status === 'done' &&
        task.due_date &&
        new Date(task.due_date) >= sevenDaysAgo
    ).length;
    const addedCaptures = relatedCaptures.filter((capture) => new Date(capture.created_at) >= sevenDaysAgo).length;
    const addedNotes = relatedNotes.filter((note) => new Date(note.created_at) >= sevenDaysAgo).length;

    return { completedTasks, addedCaptures, addedNotes };
  }, [tasks, relatedCaptures, relatedNotes, projectId]);

  const projectSignals = useMemo(() => {
    const signals: { severity: 'high' | 'medium' | 'low'; message: string }[] = [];
    const noAction = pendingTasks.length === 0;
    const hasUnprocessedCaptures = relatedCaptures.some(
      (capture) => capture.status === 'unprocessed' || capture.status === 'unsorted'
    );
    const isStale = (computedQueueItems || []).some(
      (item) => item.item_id === projectId && item.item_type === 'project' && item.reason.includes('progress')
    );

    if (noAction) {
      signals.push({ severity: 'high', message: 'No next action or tasks planned' });
    }
    if (isStale) {
      signals.push({ severity: 'medium', message: 'Stale: no progress in 14 days' });
    }
    if (hasUnprocessedCaptures) {
      signals.push({ severity: 'low', message: 'Has unprocessed captured slips' });
    }

    return signals;
  }, [pendingTasks, relatedCaptures, computedQueueItems, projectId]);

  if (!project) {
    return (
      <div className="space-y-8">
        <Link
          href="/projects"
          className="inline-flex items-center space-x-2 font-label text-xs text-secondary hover:text-primary uppercase tracking-wider btn-press"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
        <EmptyState
          title="Project unavailable"
          description="This project could not be found or is still loading."
          action={<SecondaryButton onClick={() => router.push('/projects')}>Return to projects</SecondaryButton>}
        />
      </div>
    );
  }

  const progress = (() => {
    if (projTasks.length === 0) return 0;
    const weights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let completedWeight = 0;
    projTasks.forEach((task) => {
      const weight = weights[task.priority] || 1;
      totalWeight += weight;
      if (task.status === 'done') completedWeight += weight;
    });
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  })();

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    if (editStatus === 'completed' && pendingTasks.length > 0) {
      setPendingStatusChange('completed');
      setShowGuardModal(true);
      return;
    }

    await saveProjectUpdates({
      name: editName,
      description: editDesc || undefined,
      client: editClient || undefined,
      gain: editGain || undefined,
      start_date: editStartDate || undefined,
      deadline: editDeadline || undefined,
      status: editStatus,
      area: editArea,
      color: editColor
    });
  };

  const saveProjectUpdates = async (updates: Partial<Project>) => {
    await updateProject(project.id, updates);
    showToast('Project updated successfully.', 'success');
    setIsEditing(false);
  };

  const handleConfirmGuardChange = async () => {
    setShowGuardModal(false);
    if (pendingStatusChange) {
      await saveProjectUpdates({
        name: editName,
        description: editDesc || undefined,
        client: editClient || undefined,
        gain: editGain || undefined,
        start_date: editStartDate || undefined,
        deadline: editDeadline || undefined,
        status: pendingStatusChange,
        area: editArea,
        color: editColor
      });
      setPendingStatusChange(null);
    }
  };

  const handleToggleArchive = async () => {
    const nextArchived = !project.is_archived;
    await archiveProject(project.id, nextArchived);
    showToast(nextArchived ? 'Project archived successfully.' : 'Project unarchived successfully.', 'success');
  };

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskName.trim()) return;

    await addTask(
      project.id,
      quickTaskName,
      quickTaskDesc || undefined,
      quickTaskPriority,
      quickTaskDueDate || undefined,
      'none',
      undefined,
      [],
      quickTaskCategory
    );

    showToast('Task added successfully.', 'success');
    setQuickTaskName('');
    setQuickTaskDesc('');
    setQuickTaskDueDate('');
    setQuickTaskPriority('medium');
    setShowAdvanced(false);
    setIsAddingTask(false);
  };

  const handleStartFocusSession = (taskId: string) => {
    localStorage.setItem('pomodoro_activeTaskId', taskId);
    localStorage.setItem('pomodoro_isRunning', 'true');
    localStorage.setItem('pomodoro_timeRemaining', '1500');
    localStorage.setItem('pomodoro_isBreak', 'false');
    window.dispatchEvent(new Event('pomodoro_sync'));
    showToast('Focus session started for task.', 'success');
  };

  const handleUpdateTaskStatusWithUndo = async (taskId: string, newStatus: Task['status']) => {
    const taskObj = tasks.find((task) => task.id === taskId);
    if (!taskObj) return;

    const oldStatus = taskObj.status;
    const oldDueDate = taskObj.due_date;

    await updateTaskStatus(taskId, newStatus);

    if (newStatus === 'done' && taskObj.recurring !== 'none') {
      setTimeout(() => {
        showToast('Recurring task advanced to next occurrence.', 'success', {
          label: 'Undo',
          onClick: async () => {
            await updateTask(taskId, { status: oldStatus, due_date: oldDueDate });
          }
        });
      }, 100);
    } else {
      const statusLabel = newStatus.replace('_', ' ');
      showToast(`Task status updated to ${statusLabel}.`, 'success', {
        label: 'Undo',
        onClick: async () => {
          await updateTaskStatus(taskId, oldStatus);
        }
      });
    }
  };

  const kanbanColumns: { name: string; status: Task['status'] }[] = [
    { name: 'Backlog', status: 'backlog' },
    { name: 'Todo', status: 'todo' },
    { name: 'In Progress', status: 'in_progress' },
    { name: 'Done', status: 'done' }
  ];

  return (
    <PageShell>
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center space-x-2 font-label text-xs text-secondary hover:text-primary uppercase tracking-wider btn-press"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
      </div>

      <EditorialCard
        title={project.name}
        subtitle={`${project.area} Sector Matrix`}
        className="border-l-[10px]"
        style={{ borderLeftColor: project.color || 'var(--accent)' }}
        action={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SecondaryButton onClick={() => setIsEditing(!isEditing)} className="min-h-10 px-4">
              <Edit3 className="h-3.5 w-3.5 text-secondary" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Matrix'}</span>
            </SecondaryButton>
            <SecondaryButton
              onClick={handleToggleArchive}
              className={`min-h-10 px-4 ${project.is_archived ? 'border-accent/30 bg-accent/10 text-accent hover:border-accent hover:bg-accent/15' : ''}`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{project.is_archived ? 'Unarchive' : 'Archive'}</span>
            </SecondaryButton>
            <PrimaryButton onClick={() => setDeleteModalOpen(true)} variant="danger" className="min-h-10 px-4 shadow-none">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </PrimaryButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <StatusBadge status={project.status || 'active'} type="status" />
            {project.is_archived && (
              <span className="font-label text-xs border border-accent/40 bg-accent/5 text-accent px-3 py-1 uppercase tracking-[0.18em] font-bold rounded-full">
                Archived
              </span>
            )}
          </div>

          {project.description && (
            <p className="font-sans text-sm text-primary leading-relaxed max-w-3xl">
              {project.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border font-label text-xs text-primary">
            {project.client && (
              <div className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4 shrink-0 text-secondary" />
                <span>Client/Audience: <strong className="font-bold">{project.client}</strong></span>
              </div>
            )}
            {project.gain && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 shrink-0 text-secondary" />
                <span>Expected Payoff: <strong className="font-bold">{project.gain}</strong></span>
              </div>
            )}
            {(project.start_date || project.deadline) && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 shrink-0 text-secondary" />
                <span>
                  Timeline: {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
                  {' '}&rarr;{' '}
                  {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex justify-between items-center text-xs font-label">
              <span className="text-secondary uppercase font-semibold">Project Completion Rate</span>
              <span className="text-primary font-bold">
                {doneTasks.length}/{projTasks.length} Completed ({progress}%)
              </span>
            </div>
            <div className="w-full bg-secondary/10 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 animate-pulse-slow"
                style={{ width: `${progress}%`, backgroundColor: project.color || 'var(--accent)' }}
              />
            </div>
          </div>
        </div>
      </EditorialCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <EditorialCard
          title="Recommended Next Action"
          subtitle="Best immediate move"
          className="bg-[linear-gradient(135deg,rgba(184,66,46,0.14),rgba(184,66,46,0.03))] border-accent/20"
        >
          <div className="space-y-2">
            {nextTask ? (
              <div className="space-y-1">
                <h4 className="font-sans text-sm font-bold text-primary">{nextTask.name}</h4>
                {nextTask.description && (
                  <p className="font-sans text-xs text-secondary leading-relaxed">{nextTask.description}</p>
                )}
                <div className="pt-2">
                  <StatusBadge status={nextTask.priority} type="priority" />
                </div>
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary italic">
                No upcoming tasks. Create a task below to establish next momentum.
              </p>
            )}
          </div>
          {nextTask && (
            <PrimaryButton onClick={() => handleStartFocusSession(nextTask.id)} className="w-full mt-5">
              <Play className="h-3.5 w-3.5 fill-current animate-pulse" />
              <span>Start Focus Session</span>
            </PrimaryButton>
          )}
        </EditorialCard>

        <EditorialCard title="Sector Health" subtitle="Signals and weekly activity" className="h-full">
          <div className="space-y-3">
            <div className="space-y-2">
              {projectSignals.length > 0 ? (
                projectSignals.map((signal, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <StalenessSignalBadge severity={signal.severity} />
                    <span className="font-sans text-xs text-primary font-medium">{signal.message}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="font-label text-[9px] border border-success/40 text-success bg-success/5 px-2 py-1 uppercase font-bold rounded-full tracking-[0.16em]">
                    Stable
                  </span>
                  <span className="font-sans text-xs text-primary font-medium">Project integrity is sound</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center font-label text-[8px] uppercase font-bold border-t border-border/40 pt-4 mt-4">
            <div className="app-panel-subtle p-3">
              <span className="text-secondary block">Completed</span>
              <span className="text-xs font-bold text-success block mt-0.5">{weeklyStats.completedTasks}</span>
            </div>
            <div className="app-panel-subtle p-3">
              <span className="text-secondary block">New Slips</span>
              <span className="text-xs font-bold text-primary block mt-0.5">{weeklyStats.addedCaptures}</span>
            </div>
            <div className="app-panel-subtle p-3">
              <span className="text-secondary block">Linked Notes</span>
              <span className="text-xs font-bold text-primary block mt-0.5">{weeklyStats.addedNotes}</span>
            </div>
          </div>
        </EditorialCard>
      </div>

      {isEditing && (
        <form onSubmit={handleEditSubmit} className="app-panel space-y-5">
          <span className="block font-label font-bold text-sm uppercase tracking-[0.2em] text-primary border-b border-border pb-3">
            Configure Project Metadata
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Sector / Area"
              value={editArea}
              onChange={(e) => setEditArea(e.target.value as Project['area'])}
              options={AREA_OPTIONS}
            />
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as Project['status'])}
              options={PROJECT_STATUS_OPTIONS}
            />
            <div className="space-y-2">
              <label className="block font-label text-xs uppercase tracking-wider text-secondary font-bold">
                Brand Accent Color
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setEditColor(color.value)}
                    className={`h-10 w-10 rounded-2xl border transition-all cursor-pointer ${
                      editColor === color.value
                        ? 'border-primary scale-105 shadow-[0_8px_18px_rgba(26,28,30,0.12)]'
                        : 'border-border hover:scale-[1.02] hover:border-primary/40'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input type="text" label="Project Name *" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <Input type="text" label="Client / Audience" value={editClient} onChange={(e) => setEditClient(e.target.value)} />
            <Input type="text" label="Project Payload / Gain" value={editGain} onChange={(e) => setEditGain(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input type="date" label="Start Date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
            <Input type="date" label="Target Deadline" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
          </div>

          <Textarea label="Detailed Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} />

          <PrimaryButton type="submit" className="w-full sm:w-auto">
            Save Matrix Changes
          </PrimaryButton>
        </form>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4 mt-10">
        <div>
          <p className="app-kicker mb-2">Execution</p>
          <h3 className="font-display text-2xl font-bold text-primary">Task Workspace</h3>
        </div>

        {!isAddingTask && (
          <PrimaryButton onClick={() => setIsAddingTask(true)} className="sm:self-start">
            <Plus className="h-4 w-4" />
            <span>Add Inline Task</span>
          </PrimaryButton>
        )}
      </div>

      {isAddingTask && (
        <form onSubmit={handleQuickTaskSubmit} className="app-panel space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="app-kicker mb-2">Quick Add</p>
              <span className="font-display text-xl font-bold text-primary">Configure Project Task</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="text-secondary hover:text-accent cursor-pointer btn-press"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              label="Task Name *"
              value={quickTaskName}
              onChange={(e) => setQuickTaskName(e.target.value)}
              placeholder="e.g. Draft technical specs"
              required
            />
            <Select
              label="Category"
              value={quickTaskCategory}
              onChange={(e) => setQuickTaskCategory(e.target.value as Task['category'])}
              options={TASK_CATEGORY_OPTIONS}
            />
          </div>

          <div className="flex items-center">
            <SecondaryButton
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={showAdvanced ? 'border-primary bg-surface-muted text-primary' : ''}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Advanced Options</span>
            </SecondaryButton>
          </div>

          {showAdvanced && (
            <div className="app-panel-subtle space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Priority Level"
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as Task['priority'])}
                  options={PRIORITY_OPTIONS}
                />
                <Input
                  type="date"
                  label="Due Date"
                  value={quickTaskDueDate}
                  onChange={(e) => setQuickTaskDueDate(e.target.value)}
                />
              </div>

              <Input
                type="text"
                label="Notes / Details"
                value={quickTaskDesc}
                onChange={(e) => setQuickTaskDesc(e.target.value)}
                placeholder="e.g. requirements checklist..."
              />
            </div>
          )}

          <PrimaryButton type="submit" className="w-full sm:w-auto">
            Save Task
          </PrimaryButton>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kanbanColumns.map((column) => {
          const colTasks = projTasks.filter((task) => task.status === column.status && !task.parent_task_id);
          return (
            <EditorialCard
              key={column.status}
              title={`${column.name} (${colTasks.length})`}
              subtitle="Workflow lane"
              className="h-full"
            >
              <div className="space-y-3 flex-1">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="app-panel-subtle flex flex-col justify-between gap-4 hover:border-primary transition-all group cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {task.category ? <StatusBadge status={task.category} type="category" /> : <div />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinTask(task.id);
                            }}
                            className={`text-xs shrink-0 cursor-pointer btn-press transition-opacity ${
                              task.is_pinned
                                ? 'text-accent opacity-100'
                                : 'text-stone-300 group-hover:text-secondary opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Pin className="h-3 w-3 fill-current" />
                          </button>
                        </div>

                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'done'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className="mt-0.5 h-4 w-4 accent-accent shrink-0 cursor-pointer"
                          />
                          <span
                            className={`font-sans text-sm font-semibold text-primary leading-snug ${
                              task.status === 'done' ? 'line-through text-secondary' : ''
                            }`}
                          >
                            {task.name}
                          </span>
                        </div>

                        {task.description && (
                          <p className="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 font-label text-[10px] uppercase font-bold text-secondary">
                        <StatusBadge status={task.priority} type="priority" />
                        {task.status !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartFocusSession(task.id);
                            }}
                            className="text-secondary hover:text-accent cursor-pointer flex items-center space-x-1 btn-press"
                            title="Start Focus Session"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Focus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={`No ${column.name.toLowerCase()} items`}
                    description="Add or move tasks into this lane to keep the project flow visible."
                  />
                )}
              </div>
            </EditorialCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-10 mt-10">
        <EditorialCard title="Related Captures" subtitle={`${relatedCaptures.length} slips`}>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {relatedCaptures.length > 0 ? (
              relatedCaptures.map((item) => (
                <div key={item.id} className="app-panel-subtle space-y-2">
                  <div className="flex justify-between items-baseline gap-3 font-label text-[9px] text-secondary">
                    <span className="uppercase font-bold tracking-[0.16em]">{item.type}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('en-US')}</span>
                  </div>
                  <h4 className="font-sans text-sm font-semibold text-primary">{item.title}</h4>
                  {item.content && (
                    <p className="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">{item.content}</p>
                  )}
                  <div className="flex justify-between items-baseline gap-3 pt-2">
                    <span className="font-label text-[9px] uppercase font-bold tracking-[0.16em] text-accent">{item.status}</span>
                    <Link
                      href={`/inbox?id=${item.id}`}
                      className="font-label text-[10px] uppercase font-bold tracking-[0.16em] text-secondary hover:text-primary"
                    >
                      Process Slip
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No captures linked"
                description="Inbox captures connected to this project will surface here for follow-through."
              />
            )}
          </div>
        </EditorialCard>

        <EditorialCard title="Related Knowledge Notes" subtitle={`${relatedNotes.length} notes`}>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {relatedNotes.length > 0 ? (
              relatedNotes.map((note) => (
                <div key={note.id} className="app-panel-subtle space-y-2">
                  <div className="flex justify-between items-baseline gap-3 font-label text-[9px] text-secondary">
                    <span className="uppercase font-bold tracking-[0.16em]">{note.topic || 'General'}</span>
                    <span>{new Date(note.created_at).toLocaleDateString('en-US')}</span>
                  </div>
                  <h4 className="font-sans text-sm font-semibold text-primary">{note.title}</h4>
                  {note.summary && (
                    <p className="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">{note.summary}</p>
                  )}
                </div>
              ))
            ) : (
              <EmptyState
                title="No knowledge notes linked"
                description="Linked notes and supporting research for this project will accumulate here."
              />
            )}
          </div>
        </EditorialCard>
      </div>

      {showGuardModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[9990] flex items-center justify-center p-4">
          <div className="app-panel max-w-md w-full space-y-5">
            <div className="flex items-center space-x-2 text-accent border-b border-border pb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="font-label font-bold text-sm uppercase tracking-[0.18em]">Unfinished Tasks Warning</span>
            </div>
            <p className="font-sans text-sm text-primary leading-relaxed">
              This project still contains <strong className="font-semibold">{pendingTasks.length}</strong> unfinished tasks.
              Are you sure you want to mark the project as completed?
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-1">
              <SecondaryButton
                onClick={() => {
                  setShowGuardModal(false);
                  setPendingStatusChange(null);
                }}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleConfirmGuardChange}>
                Proceed as Completed
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          await deleteProject(project.id);
          showToast('Project deleted successfully.', 'info');
          router.push('/projects');
        }}
        itemName={project.name}
        itemType="project"
      />

      <TaskDetailsModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </PageShell>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="app-panel-subtle text-center py-16">
          <p className="font-sans text-sm text-secondary italic">Loading project details...</p>
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
