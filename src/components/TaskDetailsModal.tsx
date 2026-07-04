'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboard, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Inbox,
  Pencil,
  Pin,
  Play,
  Plus,
  Repeat,
  Save,
  Timer,
  Trash2,
  X
} from 'lucide-react';

interface TaskDetailsModalProps {
  taskId: string | null;
  onClose: () => void;
}

const CLOSE_ANIMATION_MS = 240;

const STATUS_OPTIONS: Array<{ value: Task['status']; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' }
];

const PRIORITY_OPTIONS: Task['priority'][] = ['high', 'medium', 'low'];
const CATEGORY_OPTIONS: NonNullable<Task['category']>[] = ['Work', 'Personal', 'Urgent', 'Learning', 'Other'];
const RECURRING_OPTIONS: Task['recurring'][] = ['none', 'daily', 'weekly', 'monthly'];

function normalizeDueDateForInput(value?: string) {
  return value ? getLocalDateString(new Date(value)) : '';
}

function toStoredDueDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`).toISOString();
}

function formatDateLabel(value?: string) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getDueTone(value?: string) {
  if (!value) return 'text-secondary';
  const dueDate = getLocalDateString(new Date(value));
  const today = getLocalDateString(new Date());
  if (dueDate < today) return 'text-danger';
  if (dueDate === today) return 'text-accent';
  return 'text-primary';
}

function getStatusPillClass(status: Task['status']) {
  if (status === 'done') return 'border-success/30 bg-success/10 text-success';
  if (status === 'blocked') return 'border-warning/30 bg-warning/10 text-warning';
  if (status === 'in_progress') return 'border-accent/30 bg-accent/10 text-accent';
  if (status === 'backlog') return 'border-secondary/25 bg-background text-secondary';
  return 'border-primary/15 bg-primary/6 text-primary';
}

function getPriorityPillClass(priority: Task['priority']) {
  if (priority === 'high') return 'border-danger/25 bg-danger/8 text-danger';
  if (priority === 'medium') return 'border-warning/25 bg-warning/10 text-warning';
  return 'border-secondary/25 bg-background text-secondary';
}

export default function TaskDetailsModal({ taskId, onClose }: TaskDetailsModalProps) {
  const { showToast } = useToast();
  const {
    tasks,
    projects,
    inboxItems,
    updateTask,
    updateTaskStatus,
    updateTaskPomodoro,
    togglePinTask,
    deleteTask,
    addTask
  } = useDashboard();

  const activeTask = taskId ? tasks.find((t) => t.id === taskId) : null;
  const parentProject = activeTask ? projects.find((p) => p.id === activeTask.project_id) : null;
  const sourceItem = activeTask?.inbox_item_id
    ? inboxItems.find((item) => item.id === activeTask.inbox_item_id)
    : null;

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskProjId, setEditTaskProjId] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<Task['category']>('Work');
  const [editTaskPriority, setEditTaskPriority] = useState<Task['priority']>('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskRecurring, setEditTaskRecurring] = useState<Task['recurring']>('none');
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (taskId) {
      setIsClosing(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!activeTask) return;

    setEditTaskName(activeTask.name);
    setEditTaskDesc(activeTask.description || '');
    setEditTaskProjId(activeTask.project_id || '');
    setEditTaskCategory(activeTask.category || 'Work');
    setEditTaskPriority(activeTask.priority);
    setEditTaskDueDate(normalizeDueDateForInput(activeTask.due_date));
    setEditTaskRecurring(activeTask.recurring || 'none');
    setIsEditingTask(false);
    setShowDiscardPrompt(false);
    setNewSubtaskName('');
  }, [activeTask]);

  const hasUnsavedChanges = Boolean(
    activeTask && (
      editTaskName !== activeTask.name ||
      editTaskDesc !== (activeTask.description || '') ||
      editTaskProjId !== (activeTask.project_id || '') ||
      editTaskCategory !== (activeTask.category || 'Work') ||
      editTaskPriority !== activeTask.priority ||
      editTaskDueDate !== normalizeDueDateForInput(activeTask.due_date) ||
      editTaskRecurring !== (activeTask.recurring || 'none')
    )
  );

  const handleSaveTaskEdit = useCallback(async () => {
    if (!activeTask) return;
    if (!editTaskName.trim()) {
      showToast('Task name cannot be empty.', 'error');
      return;
    }

    await updateTask(activeTask.id, {
      name: editTaskName.trim(),
      description: editTaskDesc.trim() || undefined,
      project_id: editTaskProjId || undefined,
      category: editTaskCategory,
      priority: editTaskPriority,
      due_date: toStoredDueDate(editTaskDueDate),
      recurring: editTaskRecurring
    });

    showToast('Task updated successfully.', 'success');
    setIsEditingTask(false);
    setShowDiscardPrompt(false);
  }, [
    activeTask,
    editTaskCategory,
    editTaskDesc,
    editTaskDueDate,
    editTaskName,
    editTaskPriority,
    editTaskProjId,
    editTaskRecurring,
    showToast,
    updateTask
  ]);

  const handleDiscardTaskEdit = useCallback(() => {
    if (!activeTask) return;

    setEditTaskName(activeTask.name);
    setEditTaskDesc(activeTask.description || '');
    setEditTaskProjId(activeTask.project_id || '');
    setEditTaskCategory(activeTask.category || 'Work');
    setEditTaskPriority(activeTask.priority);
    setEditTaskDueDate(normalizeDueDateForInput(activeTask.due_date));
    setEditTaskRecurring(activeTask.recurring || 'none');
    setIsEditingTask(false);
    setShowDiscardPrompt(false);
  }, [activeTask]);

  const requestClose = useCallback(() => {
    if (deleteConfirmOpen) {
      setDeleteConfirmOpen(false);
      return;
    }

    if (isEditingTask && hasUnsavedChanges) {
      setShowDiscardPrompt(true);
      showToast('Save or discard your changes before closing.', 'info');
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
  }, [deleteConfirmOpen, hasUnsavedChanges, isEditingTask, onClose, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
      }

      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey) && isEditingTask) {
        e.preventDefault();
        void handleSaveTaskEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveTaskEdit, isEditingTask, requestClose]);

  if (!activeTask) return null;

  const subtasks = tasks.filter((sub) => sub.parent_task_id === activeTask.id);
  const dependencyTasks = (activeTask.dependencies || [])
    .map((dependencyId) => tasks.find((task) => task.id === dependencyId))
    .filter((task): task is Task => Boolean(task));
  const doneSubtasks = subtasks.filter((sub) => sub.status === 'done').length;

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskName.trim()) return;

    await addTask(
      activeTask.project_id || undefined,
      newSubtaskName.trim(),
      '',
      activeTask.priority,
      activeTask.due_date || undefined,
      'none',
      activeTask.id,
      [],
      activeTask.category
    );

    showToast('Subtask created successfully.', 'success');
    setNewSubtaskName('');
  };

  const handleStartFocusSession = (taskTargetId: string) => {
    localStorage.setItem('pomodoro_activeTaskId', taskTargetId);
    localStorage.setItem('pomodoro_isRunning', 'true');
    localStorage.setItem('pomodoro_timeRemaining', '1500');
    localStorage.setItem('pomodoro_isBreak', 'false');
    window.dispatchEvent(new Event('pomodoro_sync'));
    showToast('Focus session started for task.', 'success');
  };

  const handleUpdateTaskStatusWithUndo = async (subId: string, newStatus: Task['status']) => {
    const taskObj = tasks.find((t) => t.id === subId);
    if (!taskObj) return;

    const oldStatus = taskObj.status;
    const oldDueDate = taskObj.due_date;

    await updateTaskStatus(subId, newStatus);

    if (newStatus === 'done' && taskObj.recurring !== 'none') {
      setTimeout(() => {
        showToast('Recurring task advanced to next occurrence.', 'success', {
          label: 'Undo',
          onClick: async () => {
            await updateTask(subId, { status: oldStatus, due_date: oldDueDate });
          }
        });
      }, 100);
      return;
    }

    showToast(`Task status updated to ${newStatus.replace('_', ' ')}.`, 'success', {
      label: 'Undo',
      onClick: async () => {
        await updateTaskStatus(subId, oldStatus);
      }
    });
  };

  const handleQuickDueDate = async (mode: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    const next = new Date();

    if (mode === 'tomorrow') next.setDate(next.getDate() + 1);
    if (mode === 'nextWeek') next.setDate(next.getDate() + 7);

    const nextValue = mode === 'clear' ? '' : getLocalDateString(next);
    const storedDueDate = nextValue ? toStoredDueDate(nextValue) : undefined;

    await updateTask(activeTask.id, { due_date: storedDueDate });
    setEditTaskDueDate(nextValue);
    showToast(
      mode === 'clear'
        ? 'Due date removed.'
        : `Due date set for ${mode === 'today' ? 'today' : mode === 'tomorrow' ? 'tomorrow' : 'next week'}.`,
      'success'
    );
  };

  const triggerDeleteTask = (id: string, name: string) => {
    setTaskToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;

    await deleteTask(taskToDelete.id);
    showToast('Task deleted successfully.', 'info');
    setDeleteConfirmOpen(false);

    if (taskToDelete.id === activeTask.id) {
      setTaskToDelete(null);
      setIsClosing(false);
      onClose();
      return;
    }

    setTaskToDelete(null);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm md:overflow-hidden ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center p-0 md:h-full md:items-center md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-detail-title"
          className={`${isClosing ? 'animate-drawer-out md:animate-modal-out' : 'animate-drawer md:animate-modal'} flex min-h-dvh w-full max-w-5xl flex-col rounded-none border-x-0 border-b-0 border-t border-white/10 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:max-h-[92vh] md:min-h-0 md:overflow-hidden md:rounded-[28px] md:border md:border-white/10`}
        >
          <div className="sticky top-0 z-10 flex justify-end px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
            <button
              type="button"
              onClick={requestClose}
              className="btn-press flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur"
              aria-label="Close task details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-border bg-[linear-gradient(135deg,rgba(184,66,46,0.14),rgba(26,28,30,0.03)_42%,rgba(26,28,30,0.01))] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pb-5 md:pt-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-1.5 md:gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.24em] ${getStatusPillClass(activeTask.status)}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {activeTask.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.24em] ${getPriorityPillClass(activeTask.priority)}`}>
                    {activeTask.priority} priority
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {parentProject ? parentProject.name : 'Standalone'}
                  </span>
                  {activeTask.category && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                      {activeTask.category}
                    </span>
                  )}
                </div>

                {isEditingTask ? (
                  <input
                    id="task-detail-title"
                    type="text"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="w-full border-none bg-transparent font-display text-2xl font-semibold text-primary outline-none md:text-3xl"
                    placeholder="Task name"
                  />
                ) : (
                  <h2 id="task-detail-title" className="font-display text-2xl font-semibold text-primary md:text-3xl">
                    {activeTask.name}
                  </h2>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-background/85 px-3 py-3">
                    <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">Due</span>
                    <div className={`mt-1 flex items-center gap-1.5 font-sans text-sm font-semibold ${getDueTone(activeTask.due_date)}`}>
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatDateLabel(activeTask.due_date)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/85 px-3 py-3">
                    <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">Focus</span>
                    <div className="mt-1 flex items-center gap-1.5 font-sans text-sm font-semibold text-primary">
                      <Timer className="h-4 w-4 text-accent" />
                      <span>{activeTask.pomodoro_sessions || 0} sessions</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/85 px-3 py-3">
                    <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">Subtasks</span>
                    <div className="mt-1 font-sans text-sm font-semibold text-primary">
                      {subtasks.length > 0 ? `${doneSubtasks}/${subtasks.length} complete` : 'None yet'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/85 px-3 py-3">
                    <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">Cycle</span>
                    <div className="mt-1 flex items-center gap-1.5 font-sans text-sm font-semibold text-primary">
                      <Repeat className="h-4 w-4 text-accent" />
                      <span>{activeTask.recurring === 'none' ? 'One-time' : activeTask.recurring}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="btn-press hidden h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 text-secondary hover:text-primary md:flex"
                aria-label="Close task details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                <button
                  type="button"
                  onClick={() => handleStartFocusSession(activeTask.id)}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-on-accent"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start Focus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateTaskPomodoro(activeTask.id, (activeTask.pomodoro_sessions || 0) + 1);
                    showToast('Pomodoro session logged.', 'info');
                  }}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-primary"
                >
                  <Timer className="h-3.5 w-3.5" />
                  Log Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    togglePinTask(activeTask.id);
                    showToast(`Task ${activeTask.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                  }}
                  className={`btn-press inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] ${
                    activeTask.is_pinned
                      ? 'border-accent/35 bg-accent/10 text-accent'
                      : 'border-border bg-background text-primary'
                  }`}
                >
                  <Pin className="h-3.5 w-3.5 fill-current" />
                  {activeTask.is_pinned ? 'Pinned' : 'Pin Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTask((prev) => !prev)}
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEditingTask ? 'View Mode' : 'Edit Details'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleUpdateTaskStatusWithUndo(activeTask.id, option.value)}
                    className={`btn-press rounded-full border px-3 py-1.5 font-label text-[10px] font-bold uppercase tracking-[0.2em] ${
                      activeTask.status === option.value
                        ? getStatusPillClass(option.value)
                        : 'border-border bg-background text-secondary hover:text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 md:flex-1 md:overflow-y-auto md:px-6 md:py-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
              <div className="space-y-6">
                <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-primary">Description</h3>
                      <p className="text-xs text-secondary">Keep the task scoped and clear enough to act on quickly.</p>
                    </div>
                    {hasUnsavedChanges && isEditingTask && (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-warning">
                        Unsaved
                      </span>
                    )}
                  </div>

                  {isEditingTask ? (
                    <textarea
                      value={editTaskDesc}
                      onChange={(e) => setEditTaskDesc(e.target.value)}
                      rows={6}
                      placeholder="Add context, acceptance criteria, links, or handoff notes."
                      className="min-h-[180px] w-full rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
                    />
                  ) : (
                    <div className="rounded-[20px] border border-border bg-surface px-4 py-4">
                      {activeTask.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-primary">{activeTask.description}</p>
                      ) : (
                        <p className="text-sm italic text-secondary">No description yet. Add context so this task is easier to resume later.</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-primary">Subtasks</h3>
                      <p className="text-xs text-secondary">Break the work down into clear, finishable steps.</p>
                    </div>
                    <span className="rounded-full border border-border bg-surface px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                      {doneSubtasks}/{subtasks.length || 0} done
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {subtasks.length > 0 ? (
                      subtasks.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface px-3 py-3">
                          <label className="flex min-w-0 flex-1 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={sub.status === 'done'}
                              onChange={() => handleUpdateTaskStatusWithUndo(sub.id, sub.status === 'done' ? 'todo' : 'done')}
                              className="h-4 w-4 shrink-0 accent-accent"
                            />
                            <div className="min-w-0">
                              <span className={`block truncate text-sm font-medium ${sub.status === 'done' ? 'text-secondary line-through' : 'text-primary'}`}>
                                {sub.name}
                              </span>
                              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary">
                                {sub.status.replace('_', ' ')}
                              </span>
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={() => triggerDeleteTask(sub.id, sub.name)}
                            className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-secondary hover:border-danger/20 hover:bg-danger/6 hover:text-danger"
                            aria-label={`Delete subtask ${sub.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-border bg-surface px-4 py-6 text-center">
                        <p className="text-sm font-medium text-primary">No subtasks yet.</p>
                        <p className="mt-1 text-xs text-secondary">Add the next step so this task is easier to execute on mobile or desktop.</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddSubtask} className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Add a subtask"
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      className="min-w-0 flex-1 rounded-[18px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskName.trim()}
                      className="btn-press inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </form>
                </section>

                {dependencyTasks.length > 0 && (
                  <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                    <div className="mb-4">
                      <h3 className="font-display text-lg font-semibold text-primary">Dependencies</h3>
                      <p className="text-xs text-secondary">These items need to move first before this task fully clears.</p>
                    </div>

                    <div className="space-y-2.5">
                      {dependencyTasks.map((dependencyTask) => (
                        <div key={dependencyTask.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface px-4 py-3">
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-medium ${dependencyTask.status === 'done' ? 'text-secondary line-through' : 'text-primary'}`}>
                              {dependencyTask.name}
                            </p>
                            <p className="mt-1 font-label text-[10px] uppercase tracking-[0.2em] text-secondary">
                              {dependencyTask.status.replace('_', ' ')}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusPillClass(dependencyTask.status)}`}>
                            {dependencyTask.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-6">
                <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-semibold text-primary">Schedule</h3>
                    <p className="text-xs text-secondary">Quick rescheduling for triage without digging through the board.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'tomorrow', label: 'Tomorrow' },
                      { key: 'nextWeek', label: 'Next Week' },
                      { key: 'clear', label: 'Clear' }
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleQuickDueDate(option.key as 'today' | 'tomorrow' | 'nextWeek' | 'clear')}
                        className="btn-press rounded-[16px] border border-border bg-surface px-3 py-3 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:border-accent"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[18px] border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <Clock3 className="h-4 w-4" />
                      <span>Current due date</span>
                    </div>
                    <p className={`mt-2 text-sm font-semibold ${getDueTone(activeTask.due_date)}`}>{formatDateLabel(activeTask.due_date)}</p>
                  </div>
                </section>

                <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-semibold text-primary">Task Settings</h3>
                    <p className="text-xs text-secondary">Use edit mode for deeper changes; status stays available at the top.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                        Project
                      </label>
                      {isEditingTask ? (
                        <select
                          value={editTaskProjId}
                          onChange={(e) => setEditTaskProjId(e.target.value)}
                          className="w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                        >
                          <option value="">Standalone</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-[16px] border border-border bg-surface px-4 py-3 text-sm font-medium text-primary">
                          {parentProject ? parentProject.name : 'Standalone task'}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                          Priority
                        </label>
                        {isEditingTask ? (
                          <select
                            value={editTaskPriority}
                            onChange={(e) => setEditTaskPriority(e.target.value as Task['priority'])}
                            className="w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                          >
                            {PRIORITY_OPTIONS.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={`rounded-[16px] border px-4 py-3 text-sm font-semibold capitalize ${getPriorityPillClass(activeTask.priority)}`}>
                            {activeTask.priority}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                          Category
                        </label>
                        {isEditingTask ? (
                          <select
                            value={editTaskCategory}
                            onChange={(e) => setEditTaskCategory(e.target.value as Task['category'])}
                            className="w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                          >
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-[16px] border border-border bg-surface px-4 py-3 text-sm font-medium text-primary">
                            {activeTask.category || 'No category'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                          Due Date
                        </label>
                        {isEditingTask ? (
                          <input
                            type="date"
                            value={editTaskDueDate}
                            onChange={(e) => setEditTaskDueDate(e.target.value)}
                            className="w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                          />
                        ) : (
                          <div className={`rounded-[16px] border border-border bg-surface px-4 py-3 text-sm font-medium ${getDueTone(activeTask.due_date)}`}>
                            {formatDateLabel(activeTask.due_date)}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block font-label text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                          Recurring
                        </label>
                        {isEditingTask ? (
                          <select
                            value={editTaskRecurring}
                            onChange={(e) => setEditTaskRecurring(e.target.value as Task['recurring'])}
                            className="w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-accent"
                          >
                            {RECURRING_OPTIONS.map((recurring) => (
                              <option key={recurring} value={recurring}>
                                {recurring === 'none' ? 'one-time' : recurring}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-[16px] border border-border bg-surface px-4 py-3 text-sm font-medium capitalize text-primary">
                            {activeTask.recurring === 'none' ? 'One-time' : activeTask.recurring}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-border bg-background/70 p-4 md:p-5">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-semibold text-primary">Connections</h3>
                    <p className="text-xs text-secondary">Useful context around how this task entered the system.</p>
                  </div>

                  <div className="space-y-3">
                    {activeTask.inbox_item_id && (
                      <Link
                        href={`/inbox?id=${activeTask.inbox_item_id}`}
                        onClick={onClose}
                        className="block rounded-[18px] border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
                      >
                        <div className="flex items-start gap-3">
                          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <div className="min-w-0">
                            <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Inbox Source</p>
                            <p className="mt-1 truncate text-sm font-medium text-primary">
                              {sourceItem ? sourceItem.title : 'Captured item'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}

                    {activeTask.created_at && (
                      <div className="rounded-[18px] border border-border bg-surface px-4 py-3">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Created</p>
                        <p className="mt-1 text-sm font-medium text-primary">{formatDateLabel(activeTask.created_at)}</p>
                      </div>
                    )}

                    {activeTask.completed_at && (
                      <div className="rounded-[18px] border border-border bg-surface px-4 py-3">
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Completed</p>
                        <p className="mt-1 text-sm font-medium text-primary">{formatDateLabel(activeTask.completed_at)}</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-danger/20 bg-danger/6 p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold text-primary">Danger Zone</h3>
                      <p className="mt-1 text-xs text-secondary">Delete the task when it should be removed entirely, including from local cache and sync.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerDeleteTask(activeTask.id, activeTask.name)}
                    className="btn-press mt-4 inline-flex items-center gap-2 rounded-[18px] border border-danger/25 bg-surface px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Task
                  </button>
                </section>
              </aside>
            </div>
          </div>

          <div className="mt-auto border-t border-border bg-surface/95 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
            {showDiscardPrompt && isEditingTask && hasUnsavedChanges && (
              <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-warning/25 bg-warning/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.24em] text-warning">Unsaved Changes</p>
                  <p className="mt-1 text-sm text-primary">Close after discarding, or keep editing and save when ready.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscardPrompt(false)}
                    className="btn-press rounded-[16px] border border-border bg-surface px-4 py-2.5 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDiscardTaskEdit();
                      requestClose();
                    }}
                    className="btn-press rounded-[16px] border border-warning/30 bg-warning/10 px-4 py-2.5 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-warning"
                  >
                    Discard & Close
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-secondary">
                {isEditingTask
                  ? 'Tip: press Ctrl/Cmd + S to save.'
                  : 'Use the quick actions above for the common task updates.'}
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={requestClose}
                  className="btn-press rounded-[18px] border border-border bg-background px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-primary"
                >
                  Close
                </button>

                {isEditingTask ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDiscardTaskEdit}
                      className="btn-press rounded-[18px] border border-border bg-background px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-primary"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveTaskEdit()}
                      className="btn-press inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-on-primary"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTask(true)}
                    className="btn-press inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-3 font-label text-[11px] font-bold uppercase tracking-[0.24em] text-on-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={taskToDelete?.name || ''}
        itemType="task"
      />
    </div>
  );
}
