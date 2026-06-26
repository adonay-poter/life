'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard, Project, Task } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
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
  SlidersHorizontal
} from 'lucide-react';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: '#1A1C1E' },
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
  const { updateProject, addTask, updateTaskStatus } = useDashboard();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  // Edit local states
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description || '');
  const [editClient, setEditClient] = useState(project.client || '');
  const [editGain, setEditGain] = useState(project.gain || '');
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
    if (!editName.trim()) return;

    await updateProject(project.id, {
      name: editName,
      description: editDesc || undefined,
      client: editClient || undefined,
      gain: editGain || undefined,
      deadline: editDeadline || undefined,
      status: editStatus,
      area: editArea,
      color: editColor
    });

    showToast('Project updated successfully.', 'success');
    setIsEditing(false);
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
        return 'bg-[#F7F5F2] text-[#6C7278] border-[#6C7278]/25';
    }
  };

  return (
    <div 
      id={`project-card-${project.id}`}
      className={`bg-white border border-[#6C7278]/30 border-l-4 p-6 rounded-sm flex flex-col justify-between space-y-4 hover:border-[#1A1C1E] transition-all relative group ${
        isTarget ? 'ring-2 ring-[#1A1C1E]' : ''
      }`}
      style={{ borderLeftColor: project.color || '#B8422E' }}
    >
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="space-y-3 font-label text-xs">
          <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2">
            <span className="font-bold uppercase text-[#1A1C1E]">Edit Metadata</span>
            <button type="button" onClick={() => setIsEditing(false)} className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs uppercase text-[#6C7278]">Sector</label>
              <select
                value={editArea}
                onChange={(e) => setEditArea(e.target.value as Project['area'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none"
              >
                <option value="Business">Business</option>
                <option value="Health">Health</option>
                <option value="Personal">Personal</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase text-[#6C7278]">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Project['status'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none"
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
            <label className="block text-xs uppercase text-[#6C7278]">Project Color</label>
            <div className="flex flex-wrap gap-2 py-1">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setEditColor(c.value)}
                  className={`h-4.5 w-4.5 rounded-full transition-all border cursor-pointer ${
                    editColor === c.value ? 'border-[#1A1C1E] scale-110 ring-1 ring-[#1A1C1E]' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs uppercase text-[#6C7278]">Project Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs uppercase text-[#6C7278]">Client</label>
            <input
              type="text"
              value={editClient}
              onChange={(e) => setEditClient(e.target.value)}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs uppercase text-[#6C7278]">Gain / Payoff</label>
            <input
              type="text"
              value={editGain}
              onChange={(e) => setEditGain(e.target.value)}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs uppercase text-[#6C7278]">Deadline</label>
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs uppercase text-[#6C7278]">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
            />
          </div>
          <button type="submit" className="w-full bg-[#1A1C1E] text-white py-1.5 text-xs uppercase font-bold tracking-wider cursor-pointer">
            Apply Changes
          </button>
        </form>
      ) : (
        <>
          <div className="space-y-3">
            {/* Top metadata tags row */}
            <div className="flex justify-between items-center">
              <span className="font-label text-xs uppercase tracking-widest text-[#6C7278] font-bold">
                {project.area}
              </span>
              <div className="flex items-center space-x-2">
                <span className={`font-label text-xs border px-2 py-0.5 uppercase tracking-wider font-bold rounded-sm ${getStatusBadgeStyle(project.status)}`}>
                  {project.status || 'active'}
                </span>
                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex space-x-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-[#6C7278] hover:text-[#1A1C1E] cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerDelete(project.id, project.name)}
                    className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Project Name */}
            <h4 className="font-display text-xl font-bold text-[#1A1C1E] leading-tight">
              {project.name}
            </h4>

            {/* Description */}
            {project.description && (
              <p className="font-sans text-xs text-[#6C7278] leading-relaxed line-clamp-3">
                {project.description}
              </p>
            )}

            {/* Client & Gain details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#6C7278]/15 font-label text-xs">
              {project.client && (
                <div className="flex items-center space-x-1.5 text-[#1A1C1E]">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: project.color || '#B8422E' }} />
                  <span className="truncate" title={project.client}>
                    Client: <strong className="font-bold">{project.client}</strong>
                  </span>
                </div>
              )}
              {project.gain && (
                <div className="flex items-center space-x-1.5 text-[#1A1C1E]">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: project.color || '#B8422E' }} />
                  <span className="truncate" title={project.gain}>
                    Gain: <strong className="font-bold">{project.gain}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Deadline view */}
            {project.deadline && (
              <div className={`flex items-center space-x-1.5 font-label text-xs pt-1 ${
                isOverdue ? 'font-bold' : 'text-[#6C7278]'
              }`} style={{ color: isOverdue ? (project.color || '#B8422E') : undefined }}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div className="flex items-center space-x-1.5">
                  <span>Deadline: {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {isOverdue && (
                    <span className="flex items-center space-x-0.5 text-xs bg-[#FFEBEE] border border-[#FFCDD2] px-1 font-bold" style={{ color: '#B8422E' }}>
                      <AlertCircle className="h-2.5 w-2.5" />
                      <span>OVERDUE</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar & Subtask Addition Area */}
          <div className="space-y-3 pt-3 border-t border-[#6C7278]/15">
            <div className="flex justify-between items-center text-xs font-label">
              <span className="text-[#6C7278] uppercase">Completed Tasks</span>
              <span className="text-[#1A1C1E] font-bold">
                {doneTasks.length}/{projTasks.length} ({progress}%)
              </span>
            </div>
            
            {/* Linear progress */}
            <div className="w-full bg-[#6C7278]/15 h-1.5 rounded-none overflow-hidden">
              <div 
                className="h-full transition-all duration-300" 
                style={{ width: `${progress}%`, backgroundColor: project.color || '#B8422E' }}
              ></div>
            </div>

            {/* Toggleable Tasks List */}
            {projTasks.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTasks(!showTasks)}
                  className="flex items-center space-x-1 font-label text-xs uppercase tracking-wider text-[#6C7278] hover:text-[#1A1C1E] cursor-pointer"
                >
                  {showTasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span>{showTasks ? 'Hide Tasks' : `Show Tasks (${projTasks.length})`}</span>
                </button>

                {showTasks && (
                  <div className="mt-2.5 space-y-1.5 pl-1 max-h-48 overflow-y-auto border-l border-dashed border-[#6C7278]/30">
                    {projTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs font-sans group/task">
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(t.id, t.status)}
                            className="text-[#6C7278] hover:text-[#1A1C1E] shrink-0 cursor-pointer"
                          >
                            {t.status === 'done' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <span className={`truncate ${t.status === 'done' ? 'line-through text-[#6C7278]/80' : 'text-[#1A1C1E]'}`}>
                            {t.name}
                          </span>
                        </div>
                        <span className={`text-xs font-label font-bold uppercase border px-1 shrink-0 ${
                          t.priority === 'high' ? 'border-[#B8422E]/30 bg-[#FFEBEE] text-[#B8422E]' : 'border-[#6C7278]/30 text-[#6C7278]'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUICK TASK ADD INLINE FORM */}
            {isAddingTask ? (
              <form onSubmit={handleQuickTaskSubmit} className="flex flex-col gap-2 pt-2 border-t border-dashed border-[#6C7278]/20 font-label text-xs">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickTaskName}
                    onChange={(e) => setQuickTaskName(e.target.value)}
                    placeholder="New task name..."
                    required
                    autoFocus
                    className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1 focus:outline-none font-sans"
                  />
                  <select
                    value={quickTaskCategory}
                    onChange={(e) => setQuickTaskCategory(e.target.value as Task['category'])}
                    className="bg-[#F7F5F2] border border-[#6C7278]/40 px-1 py-1 focus:outline-none"
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
                    className={`p-1 border rounded-sm cursor-pointer transition-colors ${
                      showAdvanced ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'border-[#6C7278]/35 text-[#6C7278] hover:text-[#1A1C1E]'
                    }`}
                    title="Toggle Advanced Options"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>

                  <button type="submit" className="bg-[#1A1C1E] text-white p-1 rounded-sm cursor-pointer">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTask(false);
                      setShowAdvanced(false);
                    }}
                    className="text-[#6C7278] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Collapsible Advanced Form Area */}
                {showAdvanced && (
                  <div className="bg-[#F7F5F2]/65 p-2 border border-[#6C7278]/20 space-y-2 mt-1 rounded-sm animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs uppercase text-[#6C7278]">Priority</label>
                        <select
                          value={quickTaskPriority}
                          onChange={(e) => setQuickTaskPriority(e.target.value as Task['priority'])}
                          className="w-full bg-white border border-[#6C7278]/30 px-1.5 py-0.5 focus:outline-none"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs uppercase text-[#6C7278]">Due Date</label>
                        <input
                          type="date"
                          value={quickTaskDueDate}
                          onChange={(e) => setQuickTaskDueDate(e.target.value)}
                          className="w-full bg-white border border-[#6C7278]/30 px-1.5 py-0.5 focus:outline-none font-sans"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs uppercase text-[#6C7278]">Detailed Notes / URL</label>
                      <input
                        type="text"
                        value={quickTaskDesc}
                        onChange={(e) => setQuickTaskDesc(e.target.value)}
                        placeholder="e.g. documentation link, extra requirements..."
                        className="w-full bg-white border border-[#6C7278]/30 px-1.5 py-0.5 focus:outline-none font-sans"
                      />
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTask(true)}
                className="hover:text-[#1A1C1E] text-xs font-label uppercase font-semibold flex items-center space-x-1 cursor-pointer"
                style={{ color: project.color || '#B8422E' }}
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

  // New Project Form state
  const [newProjArea, setNewProjArea] = useState<Project['area']>('Business');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjGain, setNewProjNameGain] = useState('');
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
    if (!newProjName.trim()) return;
    
    addProject(
      newProjArea,
      newProjName,
      newProjDesc || undefined,
      newProjColor,
      newProjClient || undefined,
      newProjGain || undefined,
      newProjDeadline || undefined,
      newProjStatus
    );

    showToast('Project initiated successfully.', 'success');

    // Reset fields
    setNewProjName('');
    setNewProjDesc('');
    setNewProjClient('');
    setNewProjNameGain('');
    setNewProjDeadline('');
    setNewProjStatus('active');
    setNewProjColor('#B8422E');
    setShowAddProject(false);
  };

  const triggerDeleteProject = (id: string, name: string) => {
    setProjToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  // Filter projects by Area
  const filteredProjects = projects.filter((p) => {
    if (selectedAreaFilter === 'All') return true;
    return p.area === selectedAreaFilter;
  });

  const getSectorCount = (area: string) => {
    return projects.filter((p) => p.area === area).length;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col sm:flex-row justify-between items-baseline gap-2">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            PROJECTS & INITIATIVES
          </h2>
          <p className="font-sans text-xs text-[#6C7278] mt-1 uppercase tracking-wider">
            Sector Matrix • Progress Calculus ({projects.length} Initiatives Active)
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Metrics & Configurator */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
          
          {/* Sector Filters */}
          <div className="bg-white border border-[#6C7278]/30 p-4 rounded-sm space-y-2">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-2 border-b border-[#6C7278]/15 pb-1">
              Select Sector
            </span>
            <div className="flex flex-wrap lg:flex-col gap-1 font-label text-xs">
              {['All', 'Business', 'Health', 'Personal', 'Finance', 'Other'].map((area) => (
                <button
                  key={area}
                  onClick={() => setSelectedAreaFilter(area)}
                  className={`w-full text-left px-2 py-1.5 flex justify-between items-center transition-colors cursor-pointer rounded-sm ${
                    selectedAreaFilter === area
                      ? 'bg-[#1A1C1E] text-white'
                      : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                  }`}
                >
                  <span>{area.toUpperCase()}</span>
                  <span className={`text-xs px-1.5 py-0.2 rounded-full ${
                    selectedAreaFilter === area ? 'bg-[#B8422E] text-white' : 'bg-[#6C7278]/15 text-[#6C7278]'
                  }`}>
                    {area === 'All' ? projects.length : getSectorCount(area)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          {!showAddProject ? (
            <button
              onClick={() => setShowAddProject(true)}
              className="w-full bg-[#B8422E] text-white py-3 font-label text-xs uppercase font-bold tracking-widest hover:bg-[#B8422E]/90 transition-colors flex items-center justify-center space-x-2 rounded-sm cursor-pointer border border-[#B8422E]"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Project</span>
            </button>
          ) : (
            /* Inline Add Project Form */
            <form onSubmit={handleAddProjSubmit} className="bg-white border border-[#1A1C1E] p-5 rounded-sm space-y-4 font-label text-xs">
              <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2">
                <span className="font-bold uppercase text-[#1A1C1E]">New Project</span>
                <button type="button" onClick={() => setShowAddProject(false)} className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Sector / Area</label>
                <select
                  value={newProjArea}
                  onChange={(e) => setNewProjArea(e.target.value as Project['area'])}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none"
                >
                  <option value="Business">Business</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Project Status</label>
                <select
                  value={newProjStatus}
                  onChange={(e) => setNewProjStatus(e.target.value as Project['status'])}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active (Standard)</option>
                  <option value="paused">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Brand Accent Color</label>
                <div className="flex flex-wrap gap-2 py-1">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewProjColor(c.value)}
                      className={`h-4.5 w-4.5 rounded-full transition-all border cursor-pointer ${
                        newProjColor === c.value ? 'border-[#1A1C1E] scale-110 ring-1 ring-[#1A1C1E]' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Project Name *</label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Design Heritage CSS"
                  required
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Client / Audience</label>
                <input
                  type="text"
                  value={newProjClient}
                  onChange={(e) => setNewProjClient(e.target.value)}
                  placeholder="e.g. Internal / Personal Growth"
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Project Payload / Gain</label>
                <input
                  type="text"
                  value={newProjClient}
                  onChange={(e) => setNewProjNameGain(e.target.value)}
                  placeholder="e.g. 15% efficiency boost"
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Target Deadline</label>
                <input
                  type="date"
                  value={newProjDeadline}
                  onChange={(e) => setNewProjDeadline(e.target.value)}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase text-[#6C7278]">Description / Notes</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Describe focus targets..."
                  rows={3}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 focus:outline-none font-sans"
                />
              </div>

              <button type="submit" className="w-full bg-[#1A1C1E] text-white py-2 text-xs uppercase font-bold tracking-wider hover:bg-[#1A1C1E]/90 cursor-pointer">
                Save Project
              </button>
            </form>
          )}

        </aside>

        {/* Right Column: Projects grid display */}
        <section className="lg:col-span-3">
          <div className="flex justify-between items-baseline mb-4">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block">
              Active Matrices ({filteredProjects.length})
            </span>
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
            <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
              <p className="font-sans text-sm text-[#6C7278] italic">No projects found in this sector.</p>
            </div>
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
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-[#6C7278] italic">Loading Projects Workspace...</p>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
