'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard, Project, Task } from '@/context/DashboardContext';
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
  PlusCircle
} from 'lucide-react';

const PROJECT_COLORS = [
  { name: 'Terracotta', value: '#B8422E' },
  { name: 'Slate', value: '#6C7278' },
  { name: 'Ink', value: '#1A1C1E' },
  { name: 'Sage', value: '#58805F' },
  { name: 'Ochre', value: '#D1A153' },
  { name: 'Bronze', value: '#8D6E63' }
];

function ProjectsContent() {
  const {
    projects,
    tasks,
    addProject,
    updateProject,
    deleteProject,
    addTask
  } = useDashboard();

  const searchParams = useSearchParams();
  const targetProjectId = searchParams ? searchParams.get('projectId') : null;

  // Form toggles
  const [showAddProject, setShowAddProject] = useState(false);

  // New Project Form state
  const [newProjArea, setNewProjArea] = useState<Project['area']>('Business');
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjGain, setNewProjGain] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjStatus, setNewProjStatus] = useState<Project['status']>('active');
  const [newProjColor, setNewProjColor] = useState('#B8422E');

  // Editing Project State
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editGain, setEditGain] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('active');
  const [editArea, setEditArea] = useState<Project['area']>('Business');
  const [editColor, setEditColor] = useState('#B8422E');

  // Quick Task Add State
  const [quickTaskProjId, setQuickTaskProjId] = useState<string | null>(null);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Task['priority']>('medium');
  const [quickTaskCategory, setQuickTaskCategory] = useState<Task['category']>('Work');

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

  // ==========================================
  // PROGRESS MATHEMATICS (Weighted)
  // ==========================================
  const calculateProjectProgress = (projId: string) => {
    const projTasks = tasks.filter((t) => t.project_id === projId);
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

  // ==========================================
  // FORM SUBMISSION HANDLERS
  // ==========================================
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

    // Reset fields
    setNewProjName('');
    setNewProjDesc('');
    setNewProjClient('');
    setNewProjGain('');
    setNewProjDeadline('');
    setNewProjStatus('active');
    setNewProjColor('#B8422E');
    setShowAddProject(false);
  };

  const handleEditProjSubmit = (e: React.FormEvent, projId: string) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateProject(projId, {
      name: editName,
      description: editDesc || undefined,
      client: editClient || undefined,
      gain: editGain || undefined,
      deadline: editDeadline || undefined,
      status: editStatus,
      area: editArea,
      color: editColor
    });

    setEditingProjId(null);
  };

  const startEditing = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditClient(proj.client || '');
    setEditGain(proj.gain || '');
    setEditDeadline(proj.deadline ? proj.deadline.split('T')[0] : '');
    setEditStatus(proj.status || 'active');
    setEditArea(proj.area);
    setEditColor(proj.color || '#B8422E');
  };

  const handleQuickTaskSubmit = (e: React.FormEvent, projId: string) => {
    e.preventDefault();
    if (!quickTaskName.trim()) return;

    addTask(
      projId,
      quickTaskName,
      undefined, // description
      quickTaskPriority,
      getLocalDateString(), // due today
      'none', // recurring
      undefined, // parent
      [], // dependencies
      quickTaskCategory
    );

    setQuickTaskProjId(null);
    setQuickTaskName('');
    setQuickTaskPriority('medium');
    setQuickTaskCategory('Work');
  };

  // Filter projects by Area
  const filteredProjects = projects.filter((p) => {
    if (selectedAreaFilter === 'All') return true;
    return p.area === selectedAreaFilter;
  });

  // Project count per sector
  const getSectorCount = (area: string) => {
    return projects.filter((p) => p.area === area).length;
  };

  // Status Style Map
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
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col sm:flex-row justify-between items-baseline gap-2">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            PROJECTS & INITIATIVES
          </h2>
          <p className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Strategic Sector Management &bull; Metric Driven Architecture
          </p>
        </div>
      </header>

      {/* Grid: Left Column (Areas Filter & New Project Form), Right Column (Projects Cards Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ==========================================
            LEFT COLUMN: SECTOR FILTERS & CREATION
           ========================================== */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* Sector/Area filters */}
          <div className="bg-white border border-[#6C7278]/30 p-5 rounded-sm">
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block font-bold border-b border-[#6C7278]/20 pb-2 mb-3">
              Sector Filtering
            </span>
            <div className="space-y-1 font-label text-xs">
              {['All', 'Business', 'Health', 'Personal', 'Finance', 'Other'].map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setSelectedAreaFilter(area)}
                  className={`w-full flex justify-between items-center px-3 py-2 rounded-sm transition-all border ${
                    selectedAreaFilter === area
                      ? 'bg-[#1A1C1E] text-white border-[#1A1C1E] font-bold'
                      : 'text-[#1A1C1E] border-transparent hover:bg-[#F7F5F2] hover:border-[#6C7278]/25'
                  }`}
                >
                  <span>{area}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    selectedAreaFilter === area ? 'bg-white text-[#1A1C1E]' : 'bg-[#6C7278]/10 text-[#6C7278]'
                  }`}>
                    {area === 'All' ? projects.length : getSectorCount(area)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Create Project Button */}
          {!showAddProject && (
            <button
              onClick={() => setShowAddProject(true)}
              className="w-full bg-[#1A1C1E] text-white py-3 font-label text-xs uppercase tracking-wider font-bold flex justify-center items-center space-x-2 border border-[#1A1C1E] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Project</span>
            </button>
          )}

          {/* Inline Project Add Form */}
          {showAddProject && (
            <form onSubmit={handleAddProjSubmit} className="bg-white border border-[#6C7278] p-5 rounded-sm space-y-4 font-label text-xs">
              <div className="flex justify-between items-center border-b border-[#6C7278]/20 pb-2">
                <span className="font-bold uppercase text-[#1A1C1E]">
                  New Project
                </span>
                <button type="button" onClick={() => setShowAddProject(false)} className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Sector (Area of Life)</label>
                <select
                  value={newProjArea}
                  onChange={(e) => setNewProjArea(e.target.value as Project['area'])}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
                >
                  <option value="Business">Business</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Status</label>
                <select
                  value={newProjStatus}
                  onChange={(e) => setNewProjStatus(e.target.value as Project['status'])}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Project Color</label>
                <div className="flex flex-wrap gap-2 py-1">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewProjColor(c.value)}
                      className={`h-5 w-5 rounded-full transition-all border cursor-pointer ${
                        newProjColor === c.value ? 'border-[#1A1C1E] scale-110 ring-1 ring-[#1A1C1E]' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Project Name *</label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Q3 Software Deliverable"
                  required
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Client / Stakeholder</label>
                <input
                  type="text"
                  value={newProjClient}
                  onChange={(e) => setNewProjClient(e.target.value)}
                  placeholder="e.g. Nile Inc. or Self"
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Gain / Payoff</label>
                <input
                  type="text"
                  value={newProjGain}
                  onChange={(e) => setNewProjGain(e.target.value)}
                  placeholder="e.g. $10,000 or Career growth"
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Project Deadline</label>
                <input
                  type="date"
                  value={newProjDeadline}
                  onChange={(e) => setNewProjDeadline(e.target.value)}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase text-[#6C7278]">Scope / Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  rows={3}
                  placeholder="Outline key deliverables..."
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <button type="submit" className="w-full bg-[#1A1C1E] text-white py-2 text-[10px] tracking-wider uppercase font-semibold cursor-pointer">
                Save Project
              </button>
            </form>
          )}

        </aside>

        {/* ==========================================
            RIGHT COLUMN: ACTIVE PROJECTS GRID
           ========================================== */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-baseline">
            <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.1em]">
              Strategic Portfolio ({filteredProjects.length})
            </span>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjects.map((p) => {
                const isEditing = editingProjId === p.id;
                const isAddingTask = quickTaskProjId === p.id;
                const progress = calculateProjectProgress(p.id);
                const projTasks = tasks.filter((t) => t.project_id === p.id);
                const doneTasks = projTasks.filter((t) => t.status === 'done');
                const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== 'completed';
                const isTarget = targetProjectId === p.id;

                return (
                  <div 
                    key={p.id} 
                    id={`project-card-${p.id}`}
                    className={`bg-white border border-[#6C7278]/30 border-l-4 p-6 rounded-sm flex flex-col justify-between space-y-4 hover:border-[#1A1C1E] transition-all relative group ${
                      isTarget ? 'ring-2 ring-[#1A1C1E]' : ''
                    }`}
                    style={{ borderLeftColor: p.color || '#B8422E' }}
                  >
                    
                    {/* EDITING FORM */}
                    {isEditing ? (
                      <form onSubmit={(e) => handleEditProjSubmit(e, p.id)} className="space-y-3 font-label text-xs">
                        <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2">
                          <span className="font-bold uppercase text-[#1A1C1E]">Edit Metadata</span>
                          <button type="button" onClick={() => setEditingProjId(null)} className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[8px] uppercase text-[#6C7278]">Sector</label>
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
                            <label className="block text-[8px] uppercase text-[#6C7278]">Status</label>
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
                          <label className="block text-[8px] uppercase text-[#6C7278]">Project Color</label>
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
                          <label className="block text-[8px] uppercase text-[#6C7278]">Project Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] uppercase text-[#6C7278]">Client</label>
                          <input
                            type="text"
                            value={editClient}
                            onChange={(e) => setEditClient(e.target.value)}
                            className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] uppercase text-[#6C7278]">Gain / Payoff</label>
                          <input
                            type="text"
                            value={editGain}
                            onChange={(e) => setEditGain(e.target.value)}
                            className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] uppercase text-[#6C7278]">Deadline</label>
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] uppercase text-[#6C7278]">Description</label>
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                            className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1 focus:outline-none font-sans"
                          />
                        </div>
                        <button type="submit" className="w-full bg-[#1A1C1E] text-white py-1.5 text-[9px] uppercase font-bold tracking-wider cursor-pointer">
                          Apply Changes
                        </button>
                      </form>
                    ) : (
                      /* PROJECT DETAIL DISPLAY */
                      <>
                        <div className="space-y-3">
                          {/* Top metadata tags row */}
                          <div className="flex justify-between items-center">
                            <span className="font-label text-[8px] uppercase tracking-widest text-[#6C7278] font-bold">
                              {p.area}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`font-label text-[8px] border px-2 py-0.5 uppercase tracking-wider font-bold rounded-sm ${getStatusBadgeStyle(p.status)}`}>
                                {p.status || 'active'}
                              </span>
                              <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex space-x-2 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => startEditing(p)}
                                  className="text-[#6C7278] hover:text-[#1A1C1E] cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProject(p.id)}
                                  className="text-[#6C7278] hover:text-[#B8422E] cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Project Name */}
                          <h4 className="font-display text-xl font-bold text-[#1A1C1E] leading-tight">
                            {p.name}
                          </h4>

                          {/* Description */}
                          {p.description && (
                            <p className="font-sans text-xs text-[#6C7278] leading-relaxed line-clamp-3">
                              {p.description}
                            </p>
                          )}

                          {/* Client & Gain details (Terracotta highlights) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#6C7278]/15 font-label text-[10px]">
                            {p.client && (
                              <div className="flex items-center space-x-1.5 text-[#1A1C1E]">
                                <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: p.color || '#B8422E' }} />
                                <span className="truncate" title={p.client}>
                                  Client: <strong className="font-bold">{p.client}</strong>
                                </span>
                              </div>
                            )}
                            {p.gain && (
                              <div className="flex items-center space-x-1.5 text-[#1A1C1E]">
                                <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: p.color || '#B8422E' }} />
                                <span className="truncate" title={p.gain}>
                                  Gain: <strong className="font-bold">{p.gain}</strong>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Deadline view */}
                          {p.deadline && (
                            <div className={`flex items-center space-x-1.5 font-label text-[10px] pt-1 ${
                              isOverdue ? 'font-bold' : 'text-[#6C7278]'
                            }`} style={{ color: isOverdue ? (p.color || '#B8422E') : undefined }}>
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <div className="flex items-center space-x-1.5">
                                <span>Deadline: {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {isOverdue && (
                                  <span className="flex items-center space-x-0.5 text-[8px] bg-[#FFEBEE] border border-[#FFCDD2] px-1 font-bold" style={{ color: '#B8422E' }}>
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
                          <div className="flex justify-between items-center text-[10px] font-label">
                            <span className="text-[#6C7278] uppercase">Completed Tasks</span>
                            <span className="text-[#1A1C1E] font-bold">
                              {doneTasks.length}/{projTasks.length} ({progress}%)
                            </span>
                          </div>
                          
                          {/* Linear progress */}
                          <div className="w-full bg-[#6C7278]/15 h-1.5 rounded-none overflow-hidden">
                            <div 
                              className="h-full transition-all duration-300" 
                              style={{ width: `${progress}%`, backgroundColor: p.color || '#B8422E' }}
                            ></div>
                          </div>

                          {/* QUICK TASK ADD INLINE FORM */}
                          {isAddingTask ? (
                            <form onSubmit={(e) => handleQuickTaskSubmit(e, p.id)} className="flex items-center gap-1.5 pt-2 border-t border-dashed border-[#6C7278]/20 font-label text-[10px]">
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
                              <button type="submit" className="bg-[#1A1C1E] text-white p-1 rounded-sm cursor-pointer">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => setQuickTaskProjId(null)} className="text-[#6C7278] cursor-pointer">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setQuickTaskProjId(p.id)}
                              className="hover:text-[#1A1C1E] text-[10px] font-label uppercase font-semibold flex items-center space-x-1 cursor-pointer"
                              style={{ color: p.color || '#B8422E' }}
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
              })}
            </div>
          ) : (
            <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
              <p className="font-sans text-sm text-[#6C7278] italic">No projects found in this sector.</p>
            </div>
          )}
        </section>

      </div>
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
