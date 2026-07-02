'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard, Project, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  X,
  Check,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  SlidersHorizontal,
  Archive
} from 'lucide-react';
import Link from 'next/link';

import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import { PrimaryButton, SecondaryButton, IconButton } from '@/components/ui/Buttons';
import { Input, Textarea, Select } from '@/components/ui/Inputs';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: 'var(--primary)' },
  { name: 'Sage', value: '#58805F' },
  { name: 'Ochre', value: '#D1A153' },
  { name: 'Bronze', value: '#8D6E63' }
];

// ==========================================
// INDIVIDUAL PROJECT CARD COMPONENT
// ==========================================
interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  isTarget: boolean;
  onTriggerDelete: (id: string, name: string) => void;
}

function ProjectCard({ project, tasks, isTarget, onTriggerDelete }: ProjectCardProps) {
  const { updateProject, archiveProject, addTask, updateTaskStatus } = useDashboard();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  // Edit local states
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description || '');
  const [editClient, setEditClient] = useState(project.client || '');
  const [editGain, setEditGain] = useState(project.gain || '');
  const [editStartDate, setEditStartDate] = useState(project.start_date ? project.start_date.split('T')[0] : '');
  const [editDeadline, setEditDeadline] = useState(project.deadline ? project.deadline.split('T')[0] : '');
  const [editStatus, setEditStatus] = useState<Project['status']>(project.status || 'active');
  const [editArea, setEditArea] = useState<Project['area']>(project.area);
  const [editColor, setEditColor] = useState(project.color || '#B8422E');

  // Quick Task Add local states
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState<Task['category']>('Work');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Task['priority']>('medium');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const projTasks = tasks.filter((t) => t.project_id === project.id);
  const doneTasks = projTasks.filter((t) => t.status === 'done');
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  // Weighted progress calculation
  const getProgress = () => {
    if (projTasks.length === 0) return 0;
    const weights = { high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let completedWeight = 0;

    projTasks.forEach((t) => {
      const w = weights[t.priority] || 1;
      totalWeight += w;
      if (t.status === 'done') {
        completedWeight += w;
      }
    });

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  const progress = getProgress();

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Project name cannot be empty.', 'error');
      return;
    }

    await updateProject(project.id, {
      name: editName,
      description: editDesc || undefined,
      client: editClient || undefined,
      gain: editGain || undefined,
      deadline: editDeadline || undefined,
      start_date: editStartDate || undefined,
      status: editStatus,
      area: editArea,
      color: editColor
    });

    showToast('Project updated successfully.', 'success');
    setIsEditing(false);
  };

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskName.trim()) {
      showToast('Task name cannot be empty.', 'error');
      return;
    }

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

    showToast('Task added to project successfully.', 'success');
    setQuickTaskName('');
    setQuickTaskDesc('');
    setQuickTaskDueDate('');
    setQuickTaskPriority('medium');
    setShowAdvanced(false);
    setIsAddingTask(false);
    setShowTasks(true); // Automatically expand task list to show new task
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: Task['status']) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    await updateTaskStatus(taskId, nextStatus);
    showToast(nextStatus === 'done' ? 'Task marked complete.' : 'Task marked incomplete.', 'success');
  };

  const getStatusBadgeStyle = (status: Project['status'] = 'active') => {
    switch (status) {
      case 'planning':
        return 'bg-[#ECEFF1] text-[#37474F] border-[#CFD8DC]';
      case 'active':
        return 'bg-[#EAF5EC] text-[#2E7D32] border-[#C8E6C9]';
      case 'paused':
        return 'bg-[#FFF9C4] text-[#F57F17] border-[#FFF59D]';
      case 'completed':
        return 'bg-[#F5F5F5] text-[#616161] border-[#E0E0E0]';
      case 'cancelled':
        return 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
      default:
        return 'bg-neutral-bg text-secondary border-secondary/25';
    }
  };

  return (
    <div 
      id={`project-card-${project.id}`}
      className={`bg-surface border border-border border-l-4 p-6 rounded-none flex flex-col justify-between space-y-4 hover:border-primary transition-all relative group ${
        isTarget ? 'ring-1 ring-primary' : ''
      }`}
      style={{ borderLeftColor: project.color || 'var(--accent)' }}
    >
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="space-y-4 font-label text-xs">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="font-bold uppercase text-primary">Edit Metadata</span>
            <button type="button" onClick={() => setIsEditing(false)} className="text-secondary hover:text-accent cursor-pointer btn-press">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-secondary font-bold">Sector</label>
              <select
                value={editArea}
                onChange={(e) => setEditArea(e.target.value as Project['area'])}
                className="w-full bg-neutral-bg border border-border p-2 focus:outline-none rounded-none font-sans"
              >
                <option value="Business">Business</option>
                <option value="Health">Health</option>
                <option value="Personal">Personal</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-secondary font-bold">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Project['status'])}
                className="w-full bg-neutral-bg border border-border p-2 focus:outline-none rounded-none font-sans"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-secondary font-bold">Project Color</label>
            <div className="flex flex-wrap gap-2 py-1">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setEditColor(c.value)}
                  className={`h-4.5 w-4.5 rounded-none transition-all border cursor-pointer ${
                    editColor === c.value ? 'border-primary scale-110 ring-1 ring-primary' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-secondary font-bold">Project Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-secondary font-bold">Client</label>
            <input
              type="text"
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-secondary font-bold">Gain / Payoff</label>
            <input
              type="text"
              value={editGain}
              onChange={(e) => setEditGain(e.target.value)}
              className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-secondary font-bold">Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-neutral-bg border border-border px-2 py-1 focus:outline-none font-sans rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-secondary font-bold">Deadline</label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full bg-neutral-bg border border-border px-2 py-1 focus:outline-none font-sans rounded-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-secondary font-bold">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none resize-none"
            />
          </div>
          <PrimaryButton type="submit" className="w-full">
            Apply Changes
          </PrimaryButton>
        </form>
      ) : (
        <>
          <div className="space-y-3">
            {/* Top metadata tags row */}
            <div className="flex justify-between items-center">
              <span className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                {project.area}
              </span>
              <div className="flex items-center space-x-2">
                <StatusBadge status={project.status || 'active'} type="status" />
                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center space-x-1.5 transition-opacity">
                  <button
                    type="button"
                    onClick={async () => {
                      const nextArchived = !project.is_archived;
                      await archiveProject(project.id, nextArchived);
                      showToast(nextArchived ? 'Project archived successfully.' : 'Project unarchived successfully.', 'success');
                    }}
                    className={`hover:text-accent cursor-pointer p-1 rounded-none hover:bg-neutral-bg/50 btn-press ${project.is_archived ? 'text-accent' : 'text-secondary'}`}
                    title={project.is_archived ? 'Unarchive Project' : 'Archive Project'}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-secondary hover:text-primary cursor-pointer p-1 rounded-none hover:bg-neutral-bg/50 btn-press"
                    title="Edit Project"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerDelete(project.id, project.name)}
                    className="text-secondary hover:text-accent cursor-pointer p-1 rounded-none hover:bg-neutral-bg/50 btn-press"
                    title="Delete Project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Project Name */}
            <Link href={`/projects/${project.id}`}>
              <h4 className="font-display text-xl font-bold text-primary leading-tight hover:text-accent cursor-pointer transition-colors">
                {project.name}
              </h4>
            </Link>

            {/* Description */}
            {project.description && (
              <p className="font-sans text-xs text-secondary leading-relaxed line-clamp-3">
                {project.description}
              </p>
            )}

            {/* Client & Gain details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border font-label text-xs">
              {project.client && (
                <div className="flex items-center space-x-1.5 text-primary">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: project.color || 'var(--accent)' }} />
                  <span className="truncate" title={project.client}>
                    Client: <strong className="font-bold">{project.client}</strong>
                  </span>
                </div>
              )}
              {project.gain && (
                <div className="flex items-center space-x-1.5 text-primary">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: project.color || 'var(--accent)' }} />
                  <span className="truncate" title={project.gain}>
                    Payoff: <strong className="font-bold">{project.gain}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Timeline view */}
            {(project.start_date || project.deadline) && (
              <div className={`flex items-center space-x-1.5 font-label text-xs pt-1 ${
                isOverdue ? 'font-bold' : 'text-secondary'
              }`} style={{ color: isOverdue ? (project.color || 'var(--accent)') : undefined }}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>
                    Timeline: {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
                    {' '}&rarr;{' '}
                    {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                  </span>
                  {isOverdue && (
                    <span className="flex items-center space-x-0.5 text-xs bg-danger/5 border border-danger/30 px-1 font-bold text-danger">
                      <AlertCircle className="h-2.5 w-2.5" />
                      <span>OVERDUE</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar & Subtask Addition Area */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex justify-between items-center text-xs font-label">
              <span className="text-secondary uppercase font-semibold">Completed Tasks</span>
              <span className="text-primary font-bold">
                {doneTasks.length}/{projTasks.length} ({progress}%)
              </span>
            </div>
            
            {/* Linear progress */}
            <div className="w-full bg-secondary/10 h-1 rounded-none overflow-hidden">
              <div 
                className="h-full transition-all duration-300" 
                style={{ width: `${progress}%`, backgroundColor: project.color || 'var(--accent)' }}
              ></div>
            </div>

            {/* Toggleable Tasks List */}
            {projTasks.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTasks(!showTasks)}
                  className="flex items-center space-x-1 font-label text-xs uppercase tracking-wider text-secondary hover:text-primary cursor-pointer btn-press"
                >
                  {showTasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span>{showTasks ? 'Hide Tasks' : `Show Tasks (${projTasks.length})`}</span>
                </button>

                {showTasks && (
                  <div className="mt-2.5 space-y-1.5 pl-1 max-h-48 overflow-y-auto border-l border-dashed border-border">
                    {projTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs font-sans group/task py-0.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t.id, t.status)}
                            className="text-secondary hover:text-accent shrink-0 cursor-pointer btn-press"
                          >
                            {t.status === 'done' ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <span className={`truncate ${t.status === 'done' ? 'line-through text-secondary/70' : 'text-primary'}`}>
                            {t.name}
                          </span>
                        </div>
                        <StatusBadge status={t.priority} type="priority" className="shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUICK TASK ADD INLINE FORM */}
            {isAddingTask ? (
              <form onSubmit={handleQuickTaskSubmit} className="flex flex-col gap-2 pt-2 border-t border-dashed border-border font-label text-xs">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickTaskName}
                    onChange={(e) => setQuickTaskName(e.target.value)}
                    placeholder="New task name..."
                    required
                    autoFocus
                    className="flex-1 bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                  />
                  <select
                    value={quickTaskCategory}
                    onChange={(e) => setQuickTaskCategory(e.target.value as Task['category'])}
                    className="bg-neutral-bg border border-border px-1 py-1.5 focus:outline-none rounded-none font-sans"
                  >
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Learning">Learning</option>
                    <option value="Other">Other</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`p-1.5 border rounded-none cursor-pointer transition-colors btn-press ${
                      showAdvanced ? 'bg-primary text-on-primary border-primary' : 'border-border text-secondary hover:text-primary'
                    }`}
                    title="Toggle Advanced Options"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>

                  <button type="submit" className="bg-primary text-on-primary p-1.5 rounded-none cursor-pointer btn-press">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false);
                      setShowAdvanced(false);
                    }}
                    className="text-secondary cursor-pointer p-1.5 btn-press"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Collapsible Advanced Form Area */}
                {showAdvanced && (
                  <div className="bg-neutral-bg/65 p-2 border border-border space-y-2 mt-1 rounded-none animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase text-secondary font-bold">Priority</label>
                        <select
                          value={quickTaskPriority}
                          onChange={(e) => setQuickTaskPriority(e.target.value as Task['priority'])}
                          className="w-full bg-surface border border-border px-1.5 py-1 focus:outline-none rounded-none font-sans"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase text-secondary font-bold">Due Date</label>
                        <input
                          type="date"
                          value={quickTaskDueDate}
                          onChange={(e) => setQuickTaskDueDate(e.target.value)}
                          className="w-full bg-surface border border-border px-1.5 py-0.5 focus:outline-none font-sans rounded-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase text-secondary font-bold">Detailed Notes / URL</label>
                      <input
                        type="text"
                        value={quickTaskDesc}
                        onChange={(e) => setQuickTaskDesc(e.target.value)}
                        placeholder="e.g. documentation link, extra requirements..."
                        className="w-full bg-surface border border-border px-1.5 py-1 focus:outline-none font-sans rounded-none"
                      />
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTask(true)}
                className="hover:text-primary text-xs font-label uppercase font-bold flex items-center space-x-1 cursor-pointer btn-press pt-1"
                style={{ color: project.color || 'var(--accent)' }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Quick Add Task</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// MAIN PROJECTS COMPONENT CONTENT
// ==========================================
function ProjectsContent() {
  const {
    projects,
    tasks,
    addProject,
    deleteProject
  } = useDashboard();

  const searchParams = useSearchParams();
  const targetProjectId = searchParams ? searchParams.get('projectId') : null;
  const { showToast } = useToast();

  // Delete confirmation modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projToDelete, setProjToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form toggles
  const [showAddProject, setShowAddProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // New Project Form state
  const [newProjArea, setNewProjArea] = useState<Project['area']>('Business');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjGain, setNewProjGain] = useState('');
  const [newProjStartDate, setNewProjStartDate] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjStatus, setNewProjStatus] = useState<Project['status']>('active');
  const [newProjColor, setNewProjColor] = useState('#B8422E');

  // Sector breakdown view filter
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('All');

  // URL Target Project Focus Effect
  useEffect(() => {
    if (targetProjectId) {
      const proj = projects.find((p) => p.id === targetProjectId);
      if (proj) {
        setSelectedAreaFilter(proj.area);
        const timer = setTimeout(() => {
          const element = document.getElementById(`project-card-${targetProjectId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [targetProjectId, projects]);

  const handleAddProjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      showToast('Project name cannot be empty.', 'error');
      return;
    }
    
    addProject(
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

    // Reset fields
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

  const triggerDeleteProject = (id: string, name: string) => {
    setProjToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  // Filter projects by Area and Archival status
  const filteredProjects = projects.filter((p) => {
    const isArchived = p.is_archived || false;
    if (showArchived !== isArchived) return false;
    if (selectedAreaFilter === 'All') return true;
    return p.area === selectedAreaFilter;
  });

  const getSectorCount = (area: string) => {
    return projects.filter((p) => p.area === area && (p.is_archived || false) === showArchived).length;
  };

  return (
    <PageShell>
      {/* Header */}
      <SectionHeader
        title="Projects & Initiatives"
        subtitle={`Sector Matrix • Progress Calculus (${projects.length} Initiatives Active)`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Metrics & Configurator */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
          
          {/* Sector Filters */}
          <div className="bg-surface border border-border p-4 rounded-none space-y-2">
            <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block mb-2 border-b border-border pb-1 font-semibold">
              Select Sector
            </span>
            <div className="flex flex-wrap lg:flex-col gap-1 font-label text-xs">
              {['All', 'Business', 'Health', 'Personal', 'Finance', 'Other'].map((area) => (
                <button
                  key={area}
                  onClick={() => setSelectedAreaFilter(area)}
                  className={`w-full text-left px-2.5 py-2 flex justify-between items-center transition-colors cursor-pointer rounded-none btn-press ${
                    selectedAreaFilter === area
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-primary hover:bg-neutral-bg'
                  }`}
                >
                  <span>{area.toUpperCase()}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-bold ${
                    selectedAreaFilter === area ? 'bg-accent text-on-accent' : 'bg-secondary/15 text-secondary'
                  }`}>
                    {area === 'All' ? projects.filter((p) => (p.is_archived || false) === showArchived).length : getSectorCount(area)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          {!showAddProject ? (
            <PrimaryButton
              onClick={() => setShowAddProject(true)}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Project</span>
            </PrimaryButton>
          ) : (
            /* Inline Add Project Form */
            <form onSubmit={handleAddProjSubmit} className="bg-surface border border-border p-5 rounded-none space-y-4 font-label text-xs">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="font-bold uppercase text-primary">New Project</span>
                <button type="button" onClick={() => setShowAddProject(false)} className="text-secondary hover:text-accent cursor-pointer btn-press">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Sector / Area</label>
                <select
                  value={newProjArea}
                  onChange={(e) => setNewProjArea(e.target.value as Project['area'])}
                  className="w-full bg-neutral-bg border border-border p-2 focus:outline-none rounded-none font-sans"
                >
                  <option value="Business">Business</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Project Status</label>
                <select
                  value={newProjStatus}
                  onChange={(e) => setNewProjStatus(e.target.value as Project['status'])}
                  className="w-full bg-neutral-bg border border-border p-2 focus:outline-none rounded-none font-sans"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active (Standard)</option>
                  <option value="paused">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Brand Accent Color</label>
                <div className="flex flex-wrap gap-2 py-1">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewProjColor(c.value)}
                      className={`h-4.5 w-4.5 rounded-none transition-all border cursor-pointer ${
                        newProjColor === c.value ? 'border-primary scale-110 ring-1 ring-primary' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Project Name *</label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Design Heritage CSS"
                  required
                  className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Client / Audience</label>
                <input
                  type="text"
                  value={newProjClient}
                  onChange={(e) => setNewProjClient(e.target.value)}
                  placeholder="e.g. Internal / Personal Growth"
                  className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Project Payload / Gain</label>
                <input
                  type="text"
                  value={newProjGain}
                  onChange={(e) => setNewProjGain(e.target.value)}
                  placeholder="e.g. 15% efficiency boost"
                  className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-secondary font-bold">Start Date</label>
                  <input
                    type="date"
                    value={newProjStartDate}
                    onChange={(e) => setNewProjStartDate(e.target.value)}
                    className="w-full bg-neutral-bg border border-border px-1.5 py-1 focus:outline-none font-sans text-xs rounded-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-secondary font-bold">Target Deadline</label>
                  <input
                    type="date"
                    value={newProjDeadline}
                    onChange={(e) => setNewProjDeadline(e.target.value)}
                    className="w-full bg-neutral-bg border border-border px-1.5 py-1 focus:outline-none font-sans text-xs rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-secondary font-bold">Description / Notes</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe focus targets..."
                  rows={3}
                  className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none resize-none"
                />
              </div>

              {/* Only one crimson accent per screen: Save button is PrimaryButton (Crimson/Coral) */}
              <PrimaryButton type="submit" className="w-full">
                Save Project
              </PrimaryButton>
            </form>
          )}

        </aside>

        {/* Right Column: Projects grid display */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-border pb-3">
            <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block font-semibold">
              {showArchived ? 'Archived Matrices' : 'Active Matrices'} ({filteredProjects.length})
            </span>
            <div className="flex border border-border font-label text-[10px] uppercase tracking-wider select-none shrink-0 rounded-none bg-background overflow-hidden">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1.5 transition-all cursor-pointer font-bold btn-press ${
                  !showArchived ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/55'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1.5 border-l border-border transition-all cursor-pointer font-bold btn-press ${
                  showArchived ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/55'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  tasks={tasks}
                  isTarget={targetProjectId === p.id}
                  onTriggerDelete={triggerDeleteProject}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={showArchived ? "No Archived Projects" : "No Active Projects"}
              description={showArchived ? "You have no archived projects in this sector." : "Initiate a new project to track milestones and subtasks."}
              action={
                !showArchived && (
                  <PrimaryButton onClick={() => setShowAddProject(true)}>
                    <Plus className="h-4 w-4" />
                    <span>Initiate Project</span>
                  </PrimaryButton>
                )
              }
            />
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjToDelete(null);
        }}
        onConfirm={async () => {
          if (projToDelete) {
            await deleteProject(projToDelete.id);
            showToast('Project deleted successfully.', 'info');
          }
        }}
        itemName={projToDelete?.name || ''}
        itemType="project"
      />
    </PageShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="bg-surface border border-secondary/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-secondary italic">Loading Projects Workspace...</p>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
