'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboard, Project, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { getLocalDateString } from '@/utils/dateUtils';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  TrendingUp,
  Archive,
  Trash2,
  Edit3,
  Plus,
  SlidersHorizontal,
  Check,
  X,
  Play,
  Timer,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pin
} from 'lucide-react';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: '#1A1C1E' },
  { name: 'Sage', value: '#58805F' },
  { name: 'Ochre', value: '#D1A153' },
  { name: 'Bronze', value: '#8D6E63' }
];

function ProjectDetailContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { showToast } = useToast();
  const {
    projects,
    tasks,
    updateProject,
    archiveProject,
    deleteProject,
    addTask,
    updateTask,
    updateTaskStatus,
    togglePinTask
  } = useDashboard();

  const project = projects.find((p) => p.id === id);

  // Edit State
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

  // Quick Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState<Task['category']>('Work');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Task['priority']>('medium');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Guard Modals
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<Project['status'] | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Active task details modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load project defaults once loaded
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

  if (!project) {
    return (
      <div className="space-y-6">
        <Link href="/projects" className="inline-flex items-center space-x-2 font-label text-xs text-[#6C7278] hover:text-[#1A1C1E] uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>
        <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
          <p className="font-sans text-sm text-[#6C7278] italic">Project not found or Loading...</p>
        </div>
      </div>
    );
  }

  const projTasks = tasks.filter((t) => t.project_id === project.id);
  const doneTasks = projTasks.filter((t) => t.status === 'done');
  const pendingTasks = projTasks.filter((t) => t.status !== 'done');
  
  // Progress calculations
  const getProgress = () => {
    if (projTasks.length === 0) return 0;
    const weights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let completedWeight = 0;
    projTasks.forEach((t) => {
      const w = weights[t.priority] || 1;
      totalWeight += w;
      if (t.status === 'done') completedWeight += w;
    });
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };
  
  const progress = getProgress();
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    // Check status guard
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
    const taskObj = tasks.find((t) => t.id === taskId);
    if (!taskObj) return;

    const oldStatus = taskObj.status;
    const oldDueDate = taskObj.due_date;
    
    await updateTaskStatus(taskId, newStatus);
    
    if (newStatus === 'done' && taskObj.recurring !== 'none') {
      setTimeout(() => {
        showToast(`Recurring task advanced to next occurrence.`, 'success', {
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

  const getStatusBadgeStyle = (status: Project['status'] = 'active') => {
    switch (status) {
      case 'planning': return 'bg-[#ECEFF1] text-[#37474F] border-[#CFD8DC]';
      case 'active': return 'bg-[#EAF5EC] text-[#2E7D32] border-[#C8E6C9]';
      case 'paused': return 'bg-[#FFF9C4] text-[#F57F17] border-[#FFF59D]';
      case 'completed': return 'bg-[#F5F5F5] text-[#616161] border-[#E0E0E0]';
      case 'cancelled': return 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
      default: return 'bg-[#F7F5F2] text-[#6C7278] border-[#6C7278]/25';
    }
  };

  const kanbanColumns: { name: string; status: Task['status'] }[] = [
    { name: 'Backlog', status: 'backlog' },
    { name: 'Todo', status: 'todo' },
    { name: 'In Progress', status: 'in_progress' },
    { name: 'Done', status: 'done' }
  ];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/projects" className="inline-flex items-center space-x-2 font-label text-xs text-[#6C7278] hover:text-[#1A1C1E] uppercase tracking-wider">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Projects</span>
      </Link>

      {/* Hero Header */}
      <div 
        className="bg-white border border-[#6C7278]/30 border-l-8 p-6 md:p-8 rounded-sm shadow-sm space-y-4"
        style={{ borderLeftColor: project.color || '#B8422E' }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="font-label text-xs text-white px-2 py-0.5 uppercase tracking-wider font-bold rounded-sm" style={{ backgroundColor: project.color || '#B8422E' }}>
                {project.area}
              </span>
              <span className={`font-label text-xs border px-2.5 py-0.5 uppercase tracking-wider font-bold rounded-sm ${getStatusBadgeStyle(project.status)}`}>
                {project.status || 'active'}
              </span>
              {project.is_archived && (
                <span className="font-label text-xs border border-[#D1A153] bg-[#FFFDE7] text-[#D1A153] px-2.5 py-0.5 uppercase tracking-wider font-bold rounded-sm">
                  Archived
                </span>
              )}
            </div>
            <h2 className="font-display text-3xl font-bold text-[#1A1C1E] mt-3 leading-tight">
              {project.name}
            </h2>
          </div>

          <div className="flex items-center space-x-2.5 font-label text-xs shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 border border-[#6C7278] hover:bg-[#F7F5F2] transition-colors flex items-center space-x-1.5 cursor-pointer uppercase font-bold rounded-sm"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#6C7278]" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Matrix'}</span>
            </button>
            <button
              onClick={handleToggleArchive}
              className={`px-3.5 py-2 border border-[#6C7278] hover:bg-[#F7F5F2] transition-colors flex items-center space-x-1.5 cursor-pointer uppercase font-bold rounded-sm ${
                project.is_archived ? 'bg-[#FFFDE7] text-[#D1A153]' : ''
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{project.is_archived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-3.5 py-2 border border-[#B8422E] text-[#B8422E] hover:bg-[#FFEBEE] transition-colors flex items-center space-x-1.5 cursor-pointer uppercase font-bold rounded-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {project.description && (
          <p className="font-sans text-sm text-[#2C2D30] leading-relaxed max-w-3xl">
            {project.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#6C7278]/15 font-label text-xs text-[#1A1C1E]">
          {project.client && (
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 shrink-0 text-[#6C7278]" />
              <span>Client/Audience: <strong className="font-bold">{project.client}</strong></span>
            </div>
          )}
          {project.gain && (
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-[#6C7278]" />
              <span>Expected Payoff: <strong className="font-bold">{project.gain}</strong></span>
            </div>
          )}
          {(project.start_date || project.deadline) && (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 shrink-0 text-[#6C7278]" />
              <span>
                Timeline: {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
                {' '}&rarr;{' '}
                {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
              </span>
            </div>
          )}
        </div>

        {/* Linear progress */}
        <div className="space-y-2 pt-3">
          <div className="flex justify-between items-center text-xs font-label">
            <span className="text-[#6C7278] uppercase">Project Completion Rate</span>
            <span className="text-[#1A1C1E] font-bold">
              {doneTasks.length}/{projTasks.length} Completed ({progress}%)
            </span>
          </div>
          <div className="w-full bg-[#6C7278]/15 h-2 rounded-none overflow-hidden">
            <div 
              className="h-full transition-all duration-300" 
              style={{ width: `${progress}%`, backgroundColor: project.color || '#B8422E' }}
            ></div>
          </div>
        </div>
      </div>

      {/* Configurator Form */}
      {isEditing && (
        <form onSubmit={handleEditSubmit} className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4 font-label text-xs">
          <span className="block font-bold text-sm uppercase text-[#1A1C1E] border-b border-[#6C7278]/25 pb-2">
            Configure Project Metadata
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Sector / Area</label>
              <select
                value={editArea}
                onChange={(e) => setEditArea(e.target.value as Project['area'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none"
              >
                <option value="Business">Business</option>
                <option value="Health">Health</option>
                <option value="Personal">Personal</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Project['status'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Brand Accent Color</label>
              <div className="flex flex-wrap gap-2 py-1">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className={`h-5 w-5 rounded-full transition-all border cursor-pointer ${
                      editColor === c.value ? 'border-[#1A1C1E] scale-110 ring-1 ring-[#1A1C1E]' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Project Name *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Client / Audience</label>
              <input
                type="text"
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Project Payload / Gain</label>
              <input
                type="text"
                value={editGain}
                onChange={(e) => setEditGain(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Target Deadline</label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase text-[#6C7278]">Detailed Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
            />
          </div>

          <button type="submit" className="w-full bg-[#1A1C1E] text-white py-2.5 text-xs uppercase font-bold tracking-wider hover:bg-[#1A1C1E]/95 cursor-pointer transition-colors">
            Save Matrix Changes
          </button>
        </form>
      )}

      {/* Task Add Trigger */}
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg font-bold text-[#1A1C1E] uppercase tracking-wider">
          Task Workspace
        </h3>
        
        {!isAddingTask && (
          <button
            onClick={() => setIsAddingTask(true)}
            className="px-4 py-2 bg-[#1A1C1E] text-white hover:bg-[#B8422E] font-label text-xs uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Inline Task</span>
          </button>
        )}
      </div>

      {/* Task Creation Form */}
      {isAddingTask && (
        <form onSubmit={handleQuickTaskSubmit} className="bg-white border border-[#6C7278] p-5 rounded-sm space-y-4 font-label text-xs">
          <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2">
            <span className="font-bold uppercase text-[#1A1C1E]">Configure Project Task</span>
            <button type="button" onClick={() => setIsAddingTask(false)} className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Task Name *</label>
              <input
                type="text"
                value={quickTaskName}
                onChange={(e) => setQuickTaskName(e.target.value)}
                placeholder="e.g. Draft technical specs"
                required
                className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-[#6C7278]">Category</label>
              <select
                value={quickTaskCategory}
                onChange={(e) => setQuickTaskCategory(e.target.value as Task['category'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Urgent">Urgent</option>
                <option value="Learning">Learning</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-1.5 border rounded-sm cursor-pointer transition-colors flex items-center space-x-1 font-label text-[10px] uppercase font-bold ${
                showAdvanced ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'border-[#6C7278]/35 text-[#6C7278]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Advanced Options</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="bg-[#F7F5F2]/50 p-3 border border-[#6C7278]/25 space-y-3 rounded-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase text-[#6C7278]">Priority Level</label>
                  <select
                    value={quickTaskPriority}
                    onChange={(e) => setQuickTaskPriority(e.target.value as Task['priority'])}
                    className="w-full bg-white border border-[#6C7278]/25 p-1 focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase text-[#6C7278]">Due Date</label>
                  <input
                    type="date"
                    value={quickTaskDueDate}
                    onChange={(e) => setQuickTaskDueDate(e.target.value)}
                    className="w-full bg-white border border-[#6C7278]/25 p-1 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase text-[#6C7278]">Notes / Details</label>
                <input
                  type="text"
                  value={quickTaskDesc}
                  onChange={(e) => setQuickTaskDesc(e.target.value)}
                  placeholder="e.g. requirements checklist..."
                  className="w-full bg-white border border-[#6C7278]/25 p-1 focus:outline-none font-sans"
                />
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-[#1A1C1E] text-white py-2 text-xs uppercase font-bold tracking-wider cursor-pointer">
            Save task
          </button>
        </form>
      )}

      {/* Task Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kanbanColumns.map((col) => {
          const colTasks = projTasks.filter((t) => t.status === col.status && !t.parent_task_id);
          return (
            <div 
              key={col.status}
              className="bg-white border border-[#6C7278]/30 p-4 rounded-sm flex flex-col min-h-[300px]"
            >
              <span className="font-label text-xs text-[#1A1C1E] uppercase tracking-wide block border-b border-[#6C7278]/20 pb-2 mb-3 font-bold">
                {col.name} ({colTasks.length})
              </span>

              <div className="space-y-2.5 flex-1">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="bg-[#F7F5F2] border border-[#6C7278]/25 p-3 rounded-sm flex flex-col justify-between hover:border-[#1A1C1E] transition-all group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          {task.category && (
                            <span className="font-label text-[8px] bg-[#B8422E]/10 border border-[#B8422E]/25 text-[#B8422E] px-1 py-0.2 font-bold uppercase rounded-[2px]">
                              {task.category}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinTask(task.id);
                            }}
                            className={`text-xs shrink-0 ml-1.5 cursor-pointer ${task.is_pinned ? 'text-[#B8422E]' : 'text-stone-300 group-hover:text-[#6C7278] opacity-0 group-hover:opacity-100'}`}
                          >
                            <Pin className="h-3 w-3 fill-current" />
                          </button>
                        </div>

                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            checked={task.status === 'done'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className="h-4 w-4 accent-[#B8422E] shrink-0 cursor-pointer mt-0.5"
                          />
                          <span className={`font-sans text-xs font-semibold text-[#1A1C1E] leading-snug ${task.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                            {task.name}
                          </span>
                        </div>

                        {task.description && (
                          <p className="font-sans text-[10px] text-[#6C7278] mt-1.5 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-[#6C7278]/15 pt-2 mt-2 font-label text-[9px] uppercase font-bold text-[#6C7278]">
                        <span>{task.priority}</span>
                        {task.status !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartFocusSession(task.id);
                            }}
                            className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer flex items-center space-x-0.5"
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
                  <div className="h-20 border border-dashed border-[#6C7278]/20 flex items-center justify-center rounded-sm">
                    <span className="font-sans text-[10px] text-stone-400 italic">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guard Warning Modal */}
      {showGuardModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[9990] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#B8422E] p-6 max-w-sm w-full space-y-4 shadow-2xl rounded-sm font-label">
            <div className="flex items-center space-x-2 text-[#B8422E] border-b border-[#B8422E]/25 pb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Unfinished Tasks Warning</span>
            </div>
            <p className="font-sans text-xs text-[#2C2D30] leading-relaxed">
              This project still contains <strong className="font-semibold">{pendingTasks.length}</strong> unfinished tasks. Are you sure you want to mark the project as completed?
            </p>
            <div className="flex justify-end space-x-2 text-[10px] font-bold uppercase">
              <button
                onClick={() => {
                  setShowGuardModal(false);
                  setPendingStatusChange(null);
                }}
                className="px-3 py-1.5 border border-[#6C7278] hover:bg-[#F7F5F2] cursor-pointer rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGuardChange}
                className="px-3 py-1.5 bg-[#B8422E] text-white hover:opacity-90 cursor-pointer rounded-sm"
              >
                Proceed as Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Task Details Dialog Popup */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-[#6C7278] italic">Loading Project Details...</p>
      </div>
    }>
      <ProjectDetailContent />
    </Suspense>
  );
}
