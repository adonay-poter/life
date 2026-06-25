'use client';

import React, { useState } from 'react';
import { useDashboard, Task, Project, getLocalDateString } from '@/context/DashboardContext';
import { 
  Plus, 
  Trash2, 
  Pin, 
  Timer, 
  Calendar as CalendarIcon, 
  Layers, 
  CheckSquare, 
  AlertCircle,
  Tag,
  Check,
  X
} from 'lucide-react';

export default function TasksPage() {
  const {
    projects,
    tasks,
    addTask,
    updateTask,
    updateTaskStatus,
    togglePinTask,
    deleteTask
  } = useDashboard();

  // Tab State
  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'today'>('kanban');

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Kanban column active state for mobile view
  const [activeKanbanColumn, setActiveKanbanColumn] = useState<Task['status']>('todo');

  // Selected date for mobile Calendar agenda view (YYYY-MM-DD)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getLocalDateString());

  // Form toggles
  const [showAddTask, setShowAddTask] = useState(false);

  // New Task Form state
  const [newTaskProjId, setNewTaskProjId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskRecurring, setNewTaskRecurring] = useState<Task['recurring']>('none');
  const [newTaskParentId, setNewTaskParentId] = useState('');
  const [newTaskDepIds, setNewTaskDepIds] = useState<string[]>([]);
  const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('Work');

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<Task['status'] | null>(null);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  // ==========================================
  // FORM SUBMISSION HANDLERS
  // ==========================================
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    
    addTask(
      newTaskProjId || undefined,
      newTaskName,
      newTaskDesc,
      newTaskPriority,
      newTaskDueDate || undefined,
      newTaskRecurring,
      newTaskParentId || undefined,
      newTaskDepIds,
      newTaskCategory
    );

    // Reset Form
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskDueDate('');
    setNewTaskRecurring('none');
    setNewTaskParentId('');
    setNewTaskDepIds([]);
    setNewTaskCategory('Work');
    setShowAddTask(false);
  };

  // ==========================================
  // HTML5 KANBAN DRAG & DROP
  // ==========================================
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      await updateTaskStatus(id, status);
    }
    setDraggedTaskId(null);
  };

  // ==========================================
  // DEPENDENCY BLOCK CHECKS
  // ==========================================
  const isTaskBlocked = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    
    // Task is blocked if any dependency task is not completed (not done)
    return task.dependencies.some((depId) => {
      const depTask = tasks.find((t) => t.id === depId);
      return depTask && depTask.status !== 'done';
    });
  };

  // ==========================================
  // CALENDAR VIEWER UTILITIES
  // ==========================================
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1
    
    return { numDays, startDay };
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
  };

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  const renderCalendarGrid = () => {
    const { numDays, startDay } = getDaysInMonth(currentDate);
    const dayCells = [];

    // Empty cells for padding start of month
    for (let i = 0; i < startDay; i++) {
      dayCells.push(<div key={`empty-${i}`} className="bg-[#F7F5F2]/20 border border-[#6C7278]/20 min-h-[70px] md:min-h-[100px] p-1"></div>);
    }

    // Days cells
    for (let day = 1; day <= numDays; day++) {
      const cellDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const dayTasks = filteredTasks.filter((t) => {
        return t.due_date && getLocalDateString(new Date(t.due_date)) === cellDateStr;
      });

      dayCells.push(
        <div key={`day-${day}`} className="bg-white border border-[#6C7278]/30 min-h-[70px] md:min-h-[100px] p-2 flex flex-col justify-between rounded-sm">
          <span className="font-label text-xs font-bold text-[#6C7278]">{day}</span>
          <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[60px]">
            {dayTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => updateTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
                className={`text-[9px] px-1 py-0.5 font-sans truncate cursor-pointer border rounded-[2px] ${
                  t.status === 'done'
                    ? 'bg-[#6C7278]/10 text-[#6C7278] line-through border-transparent'
                    : 'bg-[#B8422E]/10 text-[#B8422E] border-[#B8422E]/20'
                }`}
                title={t.name}
              >
                {t.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return dayCells;
  };

  const getMobileCalendarCells = () => {
    const { numDays, startDay } = getDaysInMonth(currentDate);
    const cells = [];
    
    // Empty cells
    for (let i = 0; i < startDay; i++) {
      cells.push({ key: `empty-${i}`, day: null, dateStr: '' });
    }
    
    // Day cells
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      cells.push({ key: `day-${d}`, day: d, dateStr });
    }
    
    return cells;
  };

  // Filter tasks for columns in Kanban
  const kanbanColumns: { name: string; status: Task['status'] }[] = [
    { name: 'Backlog', status: 'backlog' },
    { name: 'Todo Queue', status: 'todo' },
    { name: 'In Progress', status: 'in_progress' },
    { name: 'Blocked', status: 'blocked' },
    { name: 'Done Log', status: 'done' }
  ];

  // Today Focus tasks (Overdue or Due Today, or Pinned)
  const todayStr = getLocalDateString();
  const todayTasks = filteredTasks.filter((t) => {
    const isDueToday = t.due_date && getLocalDateString(new Date(t.due_date)) === todayStr;
    const isOverdue = t.due_date && new Date(t.due_date) < new Date(todayStr) && getLocalDateString(new Date(t.due_date)) !== todayStr;
    return isDueToday || isOverdue || t.is_pinned;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col sm:flex-row justify-between items-baseline gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
            TASKS & SCHEDULES
          </h2>
          <p className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
            Operational Throughput &bull; Categorized Action Engines
          </p>
        </div>

        {/* View Selection Tabs */}
        <div className="flex border border-[#6C7278] font-label text-[10px] uppercase tracking-wider select-none shrink-0 self-end">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'kanban' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all border-l border-r border-[#6C7278] cursor-pointer ${
              activeTab === 'calendar' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Calendar View</span>
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'today' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Today Focus</span>
          </button>
        </div>
      </header>

      {/* Global Toolbar: Filters & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-[#6C7278]/25 p-4 rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 font-label text-xs">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-[#6C7278]" />
            <span className="uppercase tracking-wider text-[#6C7278]">Category Filter:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['All', 'Work', 'Personal', 'Urgent', 'Learning', 'Other'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 border transition-all text-[10px] uppercase font-semibold cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]'
                    : 'bg-white text-[#1A1C1E] border-[#6C7278]/30 hover:bg-[#F7F5F2]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="btn-tertiary flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>CREATE NEW TASK</span>
        </button>
      </div>

      {/* Inline Add Task Drawer */}
      {showAddTask && (
        <form onSubmit={handleAddTaskSubmit} className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4 font-label text-xs">
          <span className="block font-bold text-sm uppercase text-[#1A1C1E] border-b border-[#6C7278]/20 pb-2">
            Configure New Task
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Assign to Project</label>
              <select
                value={newTaskProjId}
                onChange={(e) => {
                  setNewTaskProjId(e.target.value);
                  setNewTaskParentId('');
                  setNewTaskDepIds([]);
                }}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="">-- Standalone Task (None) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Task Category *</label>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as Task['category'])}
                required
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Urgent">Urgent</option>
                <option value="Learning">Learning</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Task Name *</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Brief description of work"
                required
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase text-[#6C7278]">Detailed Description</label>
            <textarea
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              rows={2}
              className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Priority Level</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="high">High (Weight: 3)</option>
                <option value="medium">Medium (Weight: 2)</option>
                <option value="low">Low (Weight: 1)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Due Date</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Recurring Reset</label>
              <select
                value={newTaskRecurring}
                onChange={(e) => setNewTaskRecurring(e.target.value as Task['recurring'])}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="none">One Time</option>
                <option value="daily">Daily Reset</option>
                <option value="weekly">Weekly Reset</option>
                <option value="monthly">Monthly Reset</option>
              </select>
            </div>
          </div>

          {/* Subtask & Dependency options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#6C7278]/25">
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Parent Task (For Subtask)</label>
              <select
                value={newTaskParentId}
                onChange={(e) => setNewTaskParentId(e.target.value)}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
              >
                <option value="">-- None (Parent) --</option>
                {tasks
                  .filter((t) => t.project_id === (newTaskProjId || undefined) && !t.parent_task_id && t.status !== 'done')
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase text-[#6C7278]">Blocked By (Dependency)</label>
              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto border border-[#6C7278]/30 bg-[#F7F5F2] p-2 rounded-sm">
                {tasks
                  .filter((t) => t.project_id === (newTaskProjId || undefined) && t.status !== 'done')
                  .map((t) => {
                    const isSelected = newTaskDepIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setNewTaskDepIds(prev =>
                            prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                          );
                        }}
                        className={`font-label text-[9px] px-2 py-1 uppercase tracking-wide border rounded-[2px] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1A1C1E] text-white border-[#1A1C1E] font-bold'
                            : 'bg-white text-[#1A1C1E] border-[#6C7278]/25 hover:bg-[#F7F5F2]'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                {tasks.filter((t) => t.project_id === (newTaskProjId || undefined) && t.status !== 'done').length === 0 && (
                  <span className="font-sans text-[10px] text-[#6C7278] italic">No active tasks in this project.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={!newTaskName}
              className="flex-1 bg-[#1A1C1E] text-white py-2 uppercase tracking-wider text-[10px] font-bold disabled:opacity-50 cursor-pointer"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="px-4 py-2 border border-[#6C7278] text-[#1A1C1E] hover:bg-[#F7F5F2] uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ==========================================
          TAB VIEW 1: KANBAN BOARD
         ========================================== */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          {/* Mobile Column Selector Bar */}
          <div className="flex md:hidden border border-[#6C7278] font-label text-[9px] uppercase tracking-wider mb-4 overflow-x-auto">
            {kanbanColumns.map((col) => (
              <button
                key={col.status}
                type="button"
                onClick={() => setActiveKanbanColumn(col.status)}
                className={`flex-1 min-w-[75px] py-2 text-center border-r border-[#6C7278] last:border-r-0 transition-all ${
                  activeKanbanColumn === col.status ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                {col.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:grid md:grid-cols-5 gap-4 pb-4">
            {kanbanColumns.map((col) => {
              // Filter only parent tasks (or orphans), subtasks render inside them
              const columnTasks = filteredTasks.filter((t) => t.status === col.status && !t.parent_task_id);
              const isVisibleOnMobile = col.status === activeKanbanColumn;
              const isDraggedOver = col.status === draggedOverColumn;
              
              return (
                <div
                  key={col.status}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, col.status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`bg-white border p-4 rounded-sm flex flex-col min-h-[400px] md:min-h-[500px] transition-all duration-200 ${
                    isDraggedOver ? 'border-dashed border-[#1A1C1E] bg-[#F7F5F2]/50 scale-[1.01]' : 'border-[#6C7278]/40'
                  } ${
                    isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.1em] block border-b border-[#6C7278]/25 pb-1.5 mb-3 font-bold">
                    {col.name} ({columnTasks.length})
                  </span>

                  <div className="space-y-3 flex-1">
                    {columnTasks.map((task) => {
                      const isBlocked = isTaskBlocked(task);
                      // Subtasks list
                      const subtasks = tasks.filter((sub) => sub.parent_task_id === task.id);
                      const parentProject = projects.find((p) => p.id === task.project_id);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="bg-[#F7F5F2] border border-[#6C7278]/30 p-3 rounded-[2px] cursor-grab active:cursor-grabbing hover:border-[#1A1C1E] relative group transition-all"
                        >
                          {/* Project Name and Category Tags */}
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            <span 
                              className="font-label text-[7px] text-white px-1 py-0.2 uppercase tracking-wide block w-fit"
                              style={{ backgroundColor: parentProject?.color || '#6C7278' }}
                            >
                              {parentProject ? parentProject.name : 'Standalone'}
                            </span>
                            {task.category && (
                              <span className="font-label text-[7px] text-[#B8422E] bg-[#B8422E]/10 border border-[#B8422E]/25 px-1 py-0.2 uppercase tracking-wide block w-fit font-bold">
                                {task.category}
                              </span>
                            )}
                          </div>

                          {/* Task name */}
                          <div className="flex justify-between items-start">
                            <h6 className="font-sans text-xs font-semibold text-[#1A1C1E] leading-snug">
                              {task.name}
                            </h6>
                            
                            <button
                              type="button"
                              onClick={() => togglePinTask(task.id)}
                              className={`text-xs shrink-0 ml-1.5 cursor-pointer ${task.is_pinned ? 'text-[#B8422E]' : 'text-[#6C7278] opacity-0 group-hover:opacity-100'}`}
                            >
                              <Pin className="h-3 w-3 fill-current" />
                            </button>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="font-sans text-[10px] text-[#6C7278] mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Warnings / Blocks */}
                          {isBlocked && (
                            <div className="mt-2 flex items-center space-x-1 text-[#B8422E]">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-label text-[8px] uppercase tracking-wider font-bold">Blocked (depends unresolved)</span>
                            </div>
                          )}

                          {/* Subtask progress */}
                          {subtasks.length > 0 && (
                            <div className="mt-2.5 space-y-1 border-t border-[#6C7278]/15 pt-2">
                              <span className="font-label text-[8px] uppercase text-[#6C7278] tracking-wider block">
                                Subtasks ({subtasks.filter(s => s.status === 'done').length}/{subtasks.length})
                              </span>
                              <div className="space-y-1">
                                {subtasks.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between text-[9px] font-sans text-[#6C7278]">
                                    <span className={sub.status === 'done' ? 'line-through' : ''}>{sub.name}</span>
                                    <input
                                      type="checkbox"
                                      checked={sub.status === 'done'}
                                      onChange={() => updateTaskStatus(sub.id, sub.status === 'done' ? 'todo' : 'done')}
                                      className="h-3 w-3 accent-[#B8422E]"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bottom footer details */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#6C7278]/15">
                            <span className="font-label text-[8px] bg-white border border-[#6C7278]/20 px-1 uppercase text-[#6C7278]">
                              {task.priority}
                            </span>

                            {/* Pomodoro sessions count */}
                            <div className="flex items-center space-x-1 text-[9px] text-[#6C7278] font-sans" title="Pomodoro focused sessions">
                              <Timer className="h-3 w-3 text-[#B8422E]" />
                              <span>{task.pomodoro_sessions || 0}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="text-stone-400 hover:text-[#B8422E] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Mobile Card Move Actions Dropdown */}
                          <div className="mt-2.5 pt-2 border-t border-[#6C7278]/15 flex items-center justify-between md:hidden font-label text-[8px]">
                            <span className="text-[#6C7278] uppercase">Move status:</span>
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                              className="bg-[#F7F5F2] border border-[#6C7278] px-1.5 py-0.5 text-[9px] text-[#1A1C1E] focus:outline-none font-sans"
                            >
                              <option value="backlog">Backlog</option>
                              <option value="todo">Todo</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">Done</option>
                            </select>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB VIEW 2: CALENDAR VIEW
         ========================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* DESKTOP CALENDAR VIEW */}
          <div className="hidden md:block bg-white border border-[#6C7278] p-6 rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-display text-lg font-bold text-[#1A1C1E] uppercase tracking-wide">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-2 font-label text-[10px]">
                <button onClick={() => changeMonth(-1)} className="px-2.5 py-1 border border-[#6C7278] hover:bg-[#F7F5F2] uppercase cursor-pointer">
                  &larr; Prev
                </button>
                <button onClick={() => changeMonth(1)} className="px-2.5 py-1 border border-[#6C7278] hover:bg-[#F7F5F2] uppercase cursor-pointer">
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-label text-[9px] text-[#6C7278] uppercase tracking-wider mb-2 font-bold select-none">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 bg-[#6C7278]/20 border border-[#6C7278]/20">
              {renderCalendarGrid()}
            </div>
          </div>

          {/* MOBILE CALENDAR & AGENDA VIEW */}
          <div className="block md:hidden bg-white border border-[#6C7278] p-4 rounded-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#6C7278]/20 pb-2 mb-2">
              <h4 className="font-display text-md font-bold text-[#1A1C1E] uppercase tracking-wide">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-1.5 font-label text-[9px]">
                <button onClick={() => changeMonth(-1)} className="px-2 py-0.5 border border-[#6C7278] hover:bg-[#F7F5F2]">
                  &larr; PREV
                </button>
                <button onClick={() => changeMonth(1)} className="px-2 py-0.5 border border-[#6C7278] hover:bg-[#F7F5F2]">
                  NEXT &rarr;
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-label text-[8px] text-[#6C7278] uppercase tracking-wider font-bold select-none">
              <div>S</div>
              <div>M</div>
              <div>T</div>
              <div>W</div>
              <div>T</div>
              <div>F</div>
              <div>S</div>
            </div>

            {/* Compact Grid */}
            <div className="grid grid-cols-7 gap-1">
              {getMobileCalendarCells().map((cell) => {
                if (cell.day === null) {
                  return <div key={cell.key} className="h-9"></div>;
                }

                const hasTasks = filteredTasks.some((t) => t.due_date && getLocalDateString(new Date(t.due_date)) === cell.dateStr);
                const isSelected = selectedCalendarDate === cell.dateStr;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr)}
                    className={`h-9 w-full flex flex-col items-center justify-center relative rounded-sm font-label text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A1C1E] text-white border border-[#1A1C1E]'
                        : 'bg-white border border-[#6C7278]/20 text-[#1A1C1E] hover:bg-[#F7F5F2]'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasTasks && (
                      <span className={`h-1 w-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-[#B8422E]'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Agenda List */}
            <div className="mt-4 pt-4 border-t border-[#6C7278]/20 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="font-label text-[9px] text-[#6C7278] uppercase tracking-[0.1em] font-semibold">
                  Day Agenda
                </span>
                <span className="font-label text-[10px] text-[#B8422E] font-bold">
                  {new Date(selectedCalendarDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredTasks.filter((t) => t.due_date && getLocalDateString(new Date(t.due_date)) === selectedCalendarDate).length > 0 ? (
                  filteredTasks
                    .filter((t) => t.due_date && getLocalDateString(new Date(t.due_date)) === selectedCalendarDate)
                    .map((task) => {
                      const parentProject = projects.find((p) => p.id === task.project_id);
                      return (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-[#F7F5F2] border border-[#6C7278]/25 rounded-sm">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onChange={() => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                              className="h-4 w-4 accent-[#B8422E] shrink-0"
                            />
                            <div className="min-w-0">
                              <span className={`font-sans text-xs font-semibold text-[#1A1C1E] block truncate ${task.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                                {task.name}
                              </span>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-label text-[7px] text-[#6C7278] uppercase tracking-wider">
                                  {parentProject ? parentProject.name : 'Standalone'}
                                </span>
                                {task.category && (
                                  <span className="font-label text-[7px] text-[#B8422E] uppercase font-bold">
                                    &bull; {task.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-label text-[7px] bg-white border border-[#6C7278]/30 px-1 uppercase text-[#6C7278] shrink-0">
                            {task.priority}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <p className="font-sans text-xs text-[#6C7278] italic text-center py-4 bg-[#F7F5F2]/30 border border-dashed border-[#6C7278]/25 rounded-sm">
                    No tasks scheduled for this day.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB VIEW 3: TODAY FOCUS
         ========================================== */}
      {activeTab === 'today' && (
        <div className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-6">
          <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.15em] block mb-2 border-b border-[#6C7278]/20 pb-1 font-bold">
            Tasks Scheduled for Today or Pinned
          </span>

          <div className="space-y-3.5">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => {
                const parentProject = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-[#F7F5F2] border border-[#6C7278]/30 rounded-sm group transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={() => updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                        className="h-4 w-4 accent-[#B8422E] shrink-0 cursor-pointer"
                      />
                      <div>
                        <span className={`font-sans text-xs font-semibold text-[#1A1C1E] ${task.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                          {task.name}
                        </span>
                        {task.description && (
                          <p className="font-sans text-[10px] text-[#6C7278] mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1.5 font-label text-[8px]">
                          <span className="bg-white border border-[#6C7278]/25 px-1 text-[#6C7278]">
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="text-[#6C7278] uppercase">
                            {parentProject ? parentProject.name : 'STANDALONE'}
                          </span>
                          {task.category && (
                            <span className="text-[#B8422E] bg-[#B8422E]/10 px-1 font-bold">
                              {task.category.toUpperCase()}
                            </span>
                          )}
                          {task.recurring !== 'none' && (
                            <span className="text-[#B8422E] font-bold">
                              RECURRING: {task.recurring.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0">
                      {/* Pinned status */}
                      <button
                        onClick={() => togglePinTask(task.id)}
                        className={`text-xs cursor-pointer ${task.is_pinned ? 'text-[#B8422E]' : 'text-stone-300 hover:text-[#6C7278]'}`}
                      >
                        <Pin className="h-3.5 w-3.5 fill-current" />
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-stone-300 hover:text-[#B8422E] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="font-sans text-xs text-[#6C7278] italic text-center py-12">No focus tasks active for today.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
