'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
import Link from 'next/link';
import {
  X,
  Pin,
  Trash2,
  Timer,
  Play,
  Plus
} from 'lucide-react';

interface TaskDetailsModalProps {
  taskId: string | null;
  onClose: () => void;
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

  // Edit states
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskProjId, setEditTaskProjId] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<Task['category']>('Work');
  const [editTaskPriority, setEditTaskPriority] = useState<Task['priority']>('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskRecurring, setEditTaskRecurring] = useState<Task['recurring']>('none');

  // Subtask addition state
  const [newSubtaskName, setNewSubtaskName] = useState('');

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);

  // Sync edits on load
  useEffect(() => {
    if (activeTask) {
      setEditTaskName(activeTask.name);
      setEditTaskDesc(activeTask.description || '');
      setEditTaskProjId(activeTask.project_id || '');
      setEditTaskCategory(activeTask.category || 'Work');
      setEditTaskPriority(activeTask.priority);
      setEditTaskDueDate(activeTask.due_date ? getLocalDateString(new Date(activeTask.due_date)) : '');
      setEditTaskRecurring(activeTask.recurring || 'none');
      setIsEditingTask(false);
    }
  }, [activeTask]);

  // Keyboard escape & saving shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          return;
        }
        onClose();
      }
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        if (activeTask && isEditingTask) {
          e.preventDefault();
          handleSaveTaskEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTask,
    isEditingTask,
    editTaskName,
    editTaskDesc,
    editTaskProjId,
    editTaskCategory,
    editTaskPriority,
    editTaskDueDate,
    editTaskRecurring,
    deleteConfirmOpen
  ]);

  if (!activeTask) return null;

  const handleSaveTaskEdit = async () => {
    if (!editTaskName.trim()) {
      showToast('Task name cannot be empty.', 'error');
      return;
    }

    await updateTask(activeTask.id, {
      name: editTaskName,
      description: editTaskDesc || undefined,
      project_id: editTaskProjId || undefined,
      category: editTaskCategory,
      priority: editTaskPriority,
      due_date: editTaskDueDate || undefined,
      recurring: editTaskRecurring
    });

    showToast('Task updated successfully.', 'success');
    setIsEditingTask(false);
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskName.trim()) return;

    await addTask(
      activeTask.project_id || undefined,
      newSubtaskName,
      '', // description
      activeTask.priority,
      activeTask.due_date || undefined,
      'none', // recurring
      activeTask.id, // parent_task_id
      [], // dependencies
      activeTask.category
    );

    showToast('Subtask created successfully.', 'success');
    setNewSubtaskName('');
  };

  const handleStartFocusSession = (taskId: string) => {
    localStorage.setItem('pomodoro_activeTaskId', taskId);
    localStorage.setItem('pomodoro_isRunning', 'true');
    localStorage.setItem('pomodoro_timeRemaining', '1500'); // 25 mins
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
    } else {
      const statusLabel = newStatus.replace('_', ' ');
      showToast(`Task status updated to ${statusLabel}.`, 'success', {
        label: 'Undo',
        onClick: async () => {
          await updateTaskStatus(subId, oldStatus);
        }
      });
    }
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
    setTaskToDelete(null);
    if (taskToDelete.id === activeTask.id) {
      onClose();
    }
  };

  const subtasks = tasks.filter((sub) => sub.parent_task_id === activeTask.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="animate-modal bg-surface border-2 border-primary rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col font-sans relative">
        
        {/* Header */}
        <div className="border-b border-secondary/25 p-5 flex justify-between items-start">
          <div className="space-y-2 flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap gap-1.5">
              {/* Project Badge */}
              {(() => {
                const parentProj = projects.find((p) => p.id === activeTask.project_id);
                return (
                  <span 
                    className="font-label text-xs text-white px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]"
                    style={{ backgroundColor: parentProj?.color || '#6C7278' }}
                  >
                    {parentProj ? parentProj.name : 'Standalone Task'}
                  </span>
                );
              })()}
              
              {/* Category Badge */}
              {activeTask.category && (
                <span className="font-label text-xs text-tertiary bg-tertiary/10 border border-tertiary/25 px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]">
                  {activeTask.category}
                </span>
              )}

              {/* Status Badge */}
              <span className="font-label text-xs text-on-primary bg-primary px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]">
                {activeTask.status.replace('_', ' ')}
              </span>
            </div>
            
            {isEditingTask ? (
              <input
                type="text"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                className="font-display text-xl md:text-2xl font-bold text-primary uppercase tracking-wide border border-secondary px-2 py-1 w-full bg-neutral-bg focus:outline-none"
              />
            ) : (
              <h3 className="font-display text-xl md:text-2xl font-bold text-primary uppercase tracking-wide">
                {activeTask.name}
              </h3>
            )}
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-tertiary p-1 cursor-pointer transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {/* Main info (left column, 2 cols wide on desktop) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Description */}
            <div className="space-y-2">
              <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold block border-b border-secondary/25 pb-1">
                Detailed Description
              </span>
              
              {isEditingTask ? (
                <textarea
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-bg border border-secondary px-3 py-2 text-sm text-primary focus:outline-none font-sans"
                />
              ) : (
                <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap font-sans">
                  {activeTask.description || <span className="text-stone-400 italic">No description provided for this task.</span>}
                </p>
              )}
            </div>

            {/* Subtasks Section */}
            <div className="space-y-4">
              <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold block border-b border-secondary/25 pb-1">
                Subtasks
              </span>
              
              {/* Subtasks List */}
              <div className="space-y-2">
                {subtasks.length > 0 ? (
                  subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-2.5 bg-neutral-bg border border-secondary/20 rounded-sm">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={sub.status === 'done'}
                          onChange={() => handleUpdateTaskStatusWithUndo(sub.id, sub.status === 'done' ? 'todo' : 'done')}
                          className="h-4 w-4 accent-tertiary shrink-0 cursor-pointer"
                        />
                        <span className={`text-sm text-primary font-medium truncate ${sub.status === 'done' ? 'line-through text-secondary' : ''}`}>
                          {sub.name}
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => triggerDeleteTask(sub.id, sub.name)}
                        className="text-stone-400 hover:text-tertiary p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic font-sans py-1">No subtasks created yet.</p>
                )}
              </div>

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} className="flex items-stretch gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Create a new subtask..."
                  value={newSubtaskName}
                  onChange={(e) => setNewSubtaskName(e.target.value)}
                  className="flex-1 bg-neutral-bg border border-secondary/40 px-3 py-1.5 text-xs text-primary focus:border-primary focus:outline-none rounded-sm font-sans"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskName.trim()}
                  className="bg-primary text-on-primary hover:bg-tertiary font-label text-xs uppercase font-bold px-3 py-1.5 rounded-sm disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Blockers & Dependencies */}
            {activeTask.dependencies && activeTask.dependencies.length > 0 && (
              <div className="space-y-2">
                <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold block border-b border-secondary/25 pb-1">
                  Dependencies (Blocks this task)
                </span>
                <div className="space-y-1.5">
                  {activeTask.dependencies.map((depId) => {
                    const depTask = tasks.find((t) => t.id === depId);
                    if (!depTask) return null;
                    const isDone = depTask.status === 'done';
                    return (
                      <div key={depId} className="flex items-center space-x-2 text-xs font-sans text-primary">
                        <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-green-600' : 'bg-tertiary'}`}></span>
                        <span className={isDone ? 'line-through text-stone-400' : 'font-semibold'}>
                          {depTask.name} ({depTask.status.replace('_', ' ')})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar options (1 col wide on desktop) */}
          <div className="space-y-5 bg-neutral-bg/40 border-t md:border-t-0 md:border-l border-secondary/20 pt-5 md:pt-0 md:pl-5">
            {/* Status Edit */}
            <div className="space-y-1">
              <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                Status
              </label>
              <select
                value={activeTask.status}
                onChange={(e) => handleUpdateTaskStatusWithUndo(activeTask.id, e.target.value as Task['status'])}
                className="w-full bg-surface border border-secondary/40 px-2 py-1.5 text-xs text-primary focus:outline-none font-sans rounded-[2px] cursor-pointer"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo Queue</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done Log</option>
              </select>
            </div>

            {/* Priority Edit */}
            <div className="space-y-1">
              <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                Priority
              </label>
              {isEditingTask ? (
                <select
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value as Task['priority'])}
                  className="w-full bg-surface border border-secondary/40 px-2 py-1.5 text-xs text-primary focus:outline-none font-sans rounded-[2px] cursor-pointer"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              ) : (
                <span className={`inline-block font-label text-xs font-bold border px-2 py-0.5 uppercase tracking-wide rounded-[2px] ${
                  activeTask.priority === 'high'
                    ? 'border-tertiary/40 text-tertiary bg-tertiary/5'
                    : 'border-secondary/40 text-secondary bg-surface'
                }`}>
                  {activeTask.priority}
                </span>
              )}
            </div>

            {/* Project Selector (Edit Mode Only) */}
            {isEditingTask && (
              <div className="space-y-1">
                <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                  Project
                </label>
                <select
                  value={editTaskProjId}
                  onChange={(e) => setEditTaskProjId(e.target.value)}
                  className="w-full bg-surface border border-secondary/40 px-2 py-1.5 text-xs text-primary focus:outline-none font-sans rounded-[2px] cursor-pointer"
                >
                  <option value="">-- Standalone (None) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Selector (Edit Mode Only) */}
            {isEditingTask && (
              <div className="space-y-1">
                <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                  Category
                </label>
                <select
                  value={editTaskCategory}
                  onChange={(e) => setEditTaskCategory(e.target.value as Task['category'])}
                  className="w-full bg-surface border border-secondary/40 px-2 py-1.5 text-xs text-primary focus:outline-none font-sans rounded-[2px] cursor-pointer"
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Learning">Learning</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-1">
              <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                Due Date
              </label>
              {isEditingTask ? (
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="w-full bg-surface border border-secondary/40 px-2 py-1 text-xs text-primary focus:outline-none font-sans rounded-[2px]"
                />
              ) : (
                <span className="text-xs text-primary font-medium font-sans">
                  {activeTask.due_date 
                    ? new Date(activeTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="text-stone-400 italic">No deadline set</span>
                  }
                </span>
              )}
            </div>

            {/* Recurring Option */}
            <div className="space-y-1">
              <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                Recurring Frequency
              </label>
              {isEditingTask ? (
                <select
                  value={editTaskRecurring}
                  onChange={(e) => setEditTaskRecurring(e.target.value as Task['recurring'])}
                  className="w-full bg-surface border border-secondary/40 px-2 py-1.5 text-xs text-primary focus:outline-none font-sans rounded-[2px] cursor-pointer"
                >
                  <option value="none">One Time</option>
                  <option value="daily">Daily Reset</option>
                  <option value="weekly">Weekly Reset</option>
                  <option value="monthly">Monthly Reset</option>
                </select>
              ) : (
                <span className="text-xs text-primary font-medium uppercase font-label">
                  {activeTask.recurring !== 'none' ? `${activeTask.recurring} reset` : 'One-time task'}
                </span>
              )}
            </div>

            {/* Source Inbox Item Link */}
            {activeTask.inbox_item_id && (
              <div className="space-y-1">
                <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                  Task Origin
                </label>
                {(() => {
                  const sourceItem = inboxItems.find((i) => i.id === activeTask.inbox_item_id);
                  return (
                    <Link
                      href={`/inbox?id=${activeTask.inbox_item_id}`}
                      onClick={onClose}
                      className="text-xs font-semibold text-tertiary hover:underline flex items-center gap-1 font-sans"
                    >
                      <span>From Inbox: {sourceItem ? sourceItem.title : 'Captured Item'}</span>
                      <span className="text-[10px]">↗</span>
                    </Link>
                  );
                })()}
              </div>
            )}

            {/* Pomodoro Focus Sessions */}
            <div className="space-y-2 border-t border-secondary/25 pt-3">
              <label className="font-label text-xs text-secondary uppercase tracking-wider font-bold block">
                Focus Sessions
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-primary font-sans">
                  <Timer className="h-4.5 w-4.5 text-tertiary" />
                  <span className="text-sm font-semibold">{activeTask.pomodoro_sessions || 0} sessions</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateTaskPomodoro(activeTask.id, (activeTask.pomodoro_sessions || 0) + 1);
                    showToast('Pomodoro session logged.', 'info');
                  }}
                  className="bg-surface border border-secondary/40 hover:bg-neutral-bg hover:border-primary font-label text-xs font-bold uppercase tracking-wider px-2 py-1 transition-all rounded-sm cursor-pointer flex items-center space-x-1"
                >
                  <span>+1 Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-secondary/25 p-4 bg-neutral-bg/30 flex flex-wrap justify-between items-center gap-3 font-label text-xs uppercase font-bold">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                togglePinTask(activeTask.id);
                showToast(`Task ${activeTask.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
              }}
              className={`px-3 py-1.5 border rounded-sm cursor-pointer flex items-center space-x-1 transition-all ${
                activeTask.is_pinned 
                  ? 'bg-tertiary/10 border-tertiary text-tertiary' 
                  : 'bg-surface border-secondary/40 text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <Pin className="h-3 w-3 fill-current" />
              <span>{activeTask.is_pinned ? 'Pinned' : 'Pin Task'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                triggerDeleteTask(activeTask.id, activeTask.name);
              }}
              className="px-3 py-1.5 bg-surface border border-red-200 hover:border-red-600 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer transition-all flex items-center space-x-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {isEditingTask ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveTaskEdit}
                  className="px-4 py-1.5 bg-primary text-on-primary hover:bg-green-700 rounded-sm cursor-pointer transition-all"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-4 py-1.5 bg-surface border border-secondary/40 hover:bg-neutral-bg text-primary rounded-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTask(true)}
                className="px-4 py-1.5 bg-surface border border-secondary/40 hover:bg-neutral-bg hover:border-primary text-primary rounded-sm cursor-pointer transition-all"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Confirm Delete sub-dialog */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={taskToDelete?.name || ''}
        itemType="task"
      />
    </div>
  );
}
