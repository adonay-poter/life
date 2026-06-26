'use client';

import React, { useState, useRef } from 'react';
import { useDashboard, Task, Project } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
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
  const dragCounters = useRef<Record<string, number>>({});
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    projects,
    tasks,
    addTask,
    updateTask,
    updateTaskStatus,
    updateTaskPomodoro,
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
  // TASK DETAIL MODAL STATE
  // ==========================================
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');

  // Edit Task local state (used inside modal edit mode)
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskProjId, setEditTaskProjId] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<Task['category']>('Work');
  const [editTaskPriority, setEditTaskPriority] = useState<Task['priority']>('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskRecurring, setEditTaskRecurring] = useState<Task['recurring']>('none');

  // Keep the selected task reference updated with the latest state from context
  const activeTask = selectedTask ? tasks.find((t) => t.id === selectedTask.id) : null;

  const openTaskModal = (task: Task) => {
    setSelectedTask(task);
    setEditTaskName(task.name);
    setEditTaskDesc(task.description || '');
    setEditTaskProjId(task.project_id || '');
    setEditTaskCategory(task.category || 'Work');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.due_date ? getLocalDateString(new Date(task.due_date)) : '');
    setEditTaskRecurring(task.recurring || 'none');
    setIsEditingTask(false);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
    setIsEditingTask(false);
  };

  const handleSaveTaskEdit = async () => {
    if (!activeTask || !editTaskName.trim()) return;
    
    await updateTask(activeTask.id, {
      name: editTaskName,
      description: editTaskDesc || undefined,
      project_id: editTaskProjId || undefined,
      category: editTaskCategory,
      priority: editTaskPriority,
      due_date: editTaskDueDate ? new Date(editTaskDueDate).toISOString() : undefined,
      recurring: editTaskRecurring,
    });
    
    setIsEditingTask(false);
  };

  const handleAddSubtaskFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !newSubtaskName.trim()) return;
    
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
    
    setNewSubtaskName('');
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTask(null);
        setIsEditingTask(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    
    dragCounters.current[status] = (dragCounters.current[status] || 0) + 1;
    if (dragCounters.current[status] === 1) {
      setDraggedOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent, status: Task['status']) => {
    dragCounters.current[status] = Math.max(0, (dragCounters.current[status] || 0) - 1);
    if (dragCounters.current[status] === 0) {
      dragTimeout.current = setTimeout(() => {
        setDraggedOverColumn((prev) => (prev === status ? null : prev));
      }, 50);
    }
  };

  const handleDragEnd = () => {
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    dragCounters.current = {};
    setDraggedTaskId(null);
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    dragCounters.current = {};
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
                className={`px-3 py-1.5 border transition-all text-xs uppercase font-bold rounded-sm cursor-pointer ${
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
          <div className="flex md:hidden border border-[#6C7278] font-label text-xs uppercase tracking-wider mb-4 overflow-x-auto rounded-sm">
            {kanbanColumns.map((col) => {
              // Custom cleaner mobile name
              const mobileName = col.status === 'in_progress' ? 'Progress' : col.status === 'done' ? 'Done' : col.name.split(' ')[0];
              return (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => setActiveKanbanColumn(col.status)}
                  className={`flex-1 min-w-[85px] py-3 text-center border-r border-[#6C7278] last:border-r-0 font-bold transition-all ${
                    activeKanbanColumn === col.status ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                  }`}
                >
                  {mobileName}
                </button>
              );
            })}
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
                  onDragLeave={(e) => handleDragLeave(e, col.status)}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`bg-white border p-4 rounded-sm flex flex-col min-h-[400px] md:min-h-[500px] transition-all duration-200 relative ${
                    isDraggedOver ? 'border-dashed border-[#1A1C1E] bg-[#F7F5F2]/50 scale-[1.01]' : 'border-[#6C7278]/40'
                  } ${
                    isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  <span className="font-label text-xs text-[#1A1C1E] uppercase tracking-[0.1em] block border-b border-[#6C7278]/25 pb-2 mb-3 font-bold">
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
                          onDragEnd={handleDragEnd}
                          onClick={() => openTaskModal(task)}
                          className="bg-[#F7F5F2] border border-[#6C7278]/30 p-3.5 rounded-[2px] cursor-pointer hover:border-[#1A1C1E] hover:bg-[#F7F5F2]/90 relative group transition-all"
                        >
                          {/* Project Name and Category Tags */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span 
                              className="font-label text-[9px] text-white px-1.5 py-0.5 uppercase tracking-wide block w-fit font-bold rounded-[2px]"
                              style={{ backgroundColor: parentProject?.color || '#6C7278' }}
                            >
                              {parentProject ? parentProject.name : 'Standalone'}
                            </span>
                            {task.category && (
                              <span className="font-label text-[9px] text-[#B8422E] bg-[#B8422E]/10 border border-[#B8422E]/25 px-1.5 py-0.5 uppercase tracking-wide block w-fit font-bold rounded-[2px]">
                                {task.category}
                              </span>
                            )}
                          </div>

                          {/* Task name */}
                          <div className="flex justify-between items-start">
                            <h6 className="font-sans text-sm font-semibold text-[#1A1C1E] leading-snug">
                              {task.name}
                            </h6>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinTask(task.id);
                              }}
                              className={`text-xs shrink-0 ml-1.5 cursor-pointer ${task.is_pinned ? 'text-[#B8422E]' : 'text-[#6C7278] opacity-0 group-hover:opacity-100'}`}
                            >
                              <Pin className="h-3 w-3 fill-current" />
                            </button>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="font-sans text-xs text-[#2C2D30] mt-1.5 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Warnings / Blocks */}
                          {isBlocked && (
                            <div className="mt-2 flex items-center space-x-1 text-[#B8422E]">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-label text-[10px] uppercase tracking-wider font-bold">Blocked (depends unresolved)</span>
                            </div>
                          )}

                          {/* Subtask progress */}
                          {subtasks.length > 0 && (
                            <div className="mt-2.5 space-y-1.5 border-t border-[#6C7278]/15 pt-2">
                              <span className="font-label text-[10px] uppercase text-[#6C7278] tracking-wider block font-bold">
                                Subtasks ({subtasks.filter(s => s.status === 'done').length}/{subtasks.length})
                              </span>
                              <div className="space-y-1 bg-white/40 p-1.5 rounded-sm">
                                {subtasks.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between text-xs font-sans text-[#2C2D30] py-0.5">
                                    <span className={sub.status === 'done' ? 'line-through text-[#6C7278]' : ''}>{sub.name}</span>
                                    <input
                                      type="checkbox"
                                      checked={sub.status === 'done'}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        updateTaskStatus(sub.id, sub.status === 'done' ? 'todo' : 'done');
                                      }}
                                      className="h-3.5 w-3.5 accent-[#B8422E] cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bottom footer details */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#6C7278]/15">
                            <span className="font-label text-[10px] bg-white border border-[#6C7278]/30 px-1.5 py-0.2 uppercase text-[#6C7278] font-bold rounded-[2px]">
                              {task.priority}
                            </span>

                            {/* Pomodoro sessions count */}
                            <div className="flex items-center space-x-1.5 text-xs text-[#2C2D30] font-sans" title="Pomodoro focused sessions">
                              <Timer className="h-3.5 w-3.5 text-[#B8422E]" />
                              <span>{task.pomodoro_sessions || 0}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this task?')) {
                                  deleteTask(task.id);
                                }
                              }}
                              className="text-stone-400 hover:text-[#B8422E] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Mobile Card Move Actions Dropdown */}
                          <div className="mt-2.5 pt-2 border-t border-[#6C7278]/15 flex items-center justify-between md:hidden font-label text-[9px]">
                            <span className="text-[#6C7278] uppercase font-bold">Move status:</span>
                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, e.target.value as Task['status']);
                              }}
                              className="bg-[#F7F5F2] border border-[#6C7278] px-1.5 py-0.5 text-[10px] text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
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
            <div className="flex justify-between items-center border-b border-[#6C7278]/20 pb-2.5 mb-2">
              <h4 className="font-display text-sm font-bold text-[#1A1C1E] uppercase tracking-wide">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-1.5 font-label text-[10px]">
                <button onClick={() => changeMonth(-1)} className="px-2.5 py-1 border border-[#6C7278] hover:bg-[#F7F5F2] uppercase font-bold">
                  &larr; PREV
                </button>
                <button onClick={() => changeMonth(1)} className="px-2.5 py-1 border border-[#6C7278] hover:bg-[#F7F5F2] uppercase font-bold">
                  NEXT &rarr;
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold select-none">
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
                  return <div key={cell.key} className="h-10"></div>;
                }

                const hasTasks = filteredTasks.some((t) => t.due_date && getLocalDateString(new Date(t.due_date)) === cell.dateStr);
                const isSelected = selectedCalendarDate === cell.dateStr;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr)}
                    className={`h-10 w-full flex flex-col items-center justify-center relative rounded-sm font-label text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A1C1E] text-white border border-[#1A1C1E]'
                        : 'bg-white border border-[#6C7278]/20 text-[#1A1C1E] hover:bg-[#F7F5F2]'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasTasks && (
                      <span className={`h-1.5 w-1.5 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-[#B8422E]'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Agenda List */}
            <div className="mt-4 pt-4 border-t border-[#6C7278]/20 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-[0.1em] font-bold">
                  Day Agenda
                </span>
                <span className="font-label text-xs text-[#B8422E] font-bold">
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
                        <div 
                          key={task.id} 
                          onClick={() => openTaskModal(task)}
                          className="flex items-center justify-between p-3.5 bg-[#F7F5F2] border border-[#6C7278]/25 hover:border-[#1A1C1E] rounded-sm cursor-pointer transition-all"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done');
                              }}
                              className="h-4.5 w-4.5 accent-[#B8422E] shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className={`font-sans text-sm font-semibold text-[#1A1C1E] block truncate ${task.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                                {task.name}
                              </span>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-label text-[9px] text-[#6C7278] uppercase tracking-wider font-semibold">
                                  {parentProject ? parentProject.name : 'Standalone'}
                                </span>
                                {task.category && (
                                  <span className="font-label text-[9px] text-[#B8422E] uppercase font-bold">
                                    &bull; {task.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-label text-[10px] bg-white border border-[#6C7278]/30 px-1.5 py-0.2 uppercase text-[#6C7278] font-bold rounded-[2px] shrink-0">
                            {task.priority}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <p className="font-sans text-xs text-[#6C7278] italic text-center py-5 bg-[#F7F5F2]/30 border border-dashed border-[#6C7278]/25 rounded-sm">
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
          <span className="font-label text-xs text-[#1A1C1E] uppercase tracking-[0.15em] block mb-2 border-b border-[#6C7278]/20 pb-1.5 font-bold">
            Tasks Scheduled for Today or Pinned
          </span>

          <div className="space-y-3.5">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => {
                const parentProject = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskModal(task)}
                    className="flex items-center justify-between p-4 bg-[#F7F5F2] border border-[#6C7278]/30 hover:border-[#1A1C1E] rounded-sm group cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="h-4.5 w-4.5 accent-[#B8422E] shrink-0 cursor-pointer"
                      />
                      <div>
                        <span className={`font-sans text-sm font-semibold text-[#1A1C1E] ${task.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                          {task.name}
                        </span>
                        {task.description && (
                          <p className="font-sans text-xs text-[#2C2D30] mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2 font-label text-[10px]">
                          <span className="bg-white border border-[#6C7278]/25 px-1.5 py-0.2 text-[#6C7278] font-bold rounded-[2px]">
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="text-[#6C7278] uppercase font-semibold">
                            {parentProject ? parentProject.name : 'STANDALONE'}
                          </span>
                          {task.category && (
                            <span className="text-[#B8422E] bg-[#B8422E]/10 px-1.5 py-0.2 font-bold rounded-[2px]">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTask(task.id);
                        }}
                        className={`text-xs cursor-pointer p-1 ${task.is_pinned ? 'text-[#B8422E]' : 'text-stone-300 hover:text-[#6C7278]'}`}
                      >
                        <Pin className="h-4.5 w-4.5 fill-current" />
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this task?')) {
                            deleteTask(task.id);
                          }
                        }}
                        className="text-stone-300 hover:text-[#B8422E] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
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

      {/* ==========================================
          TASK DETAILS MODAL / POPUP
         ========================================== */}
      {activeTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white border-2 border-[#1A1C1E] rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col font-sans relative">
            {/* Header */}
            <div className="border-b border-[#6C7278]/25 p-5 flex justify-between items-start">
              <div className="space-y-2 flex-1 min-w-0 pr-4">
                <div className="flex flex-wrap gap-1.5">
                  {/* Project Badge */}
                  {(() => {
                    const parentProj = projects.find((p) => p.id === activeTask.project_id);
                    return (
                      <span 
                        className="font-label text-[9px] text-white px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]"
                        style={{ backgroundColor: parentProj?.color || '#6C7278' }}
                      >
                        {parentProj ? parentProj.name : 'Standalone Task'}
                      </span>
                    );
                  })()}
                  
                  {/* Category Badge */}
                  {activeTask.category && (
                    <span className="font-label text-[9px] text-[#B8422E] bg-[#B8422E]/10 border border-[#B8422E]/25 px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]">
                      {activeTask.category}
                    </span>
                  )}

                  {/* Status Badge */}
                  <span className="font-label text-[9px] text-white bg-[#1A1C1E] px-2 py-0.5 uppercase tracking-wider block w-fit font-bold rounded-[2px]">
                    {activeTask.status.replace('_', ' ')}
                  </span>
                </div>
                
                {isEditingTask ? (
                  <input
                    type="text"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="font-display text-xl md:text-2xl font-bold text-[#1A1C1E] uppercase tracking-wide border border-[#6C7278] px-2 py-1 w-full bg-[#F7F5F2]"
                  />
                ) : (
                  <h3 className="font-display text-xl md:text-2xl font-bold text-[#1A1C1E] uppercase tracking-wide">
                    {activeTask.name}
                  </h3>
                )}
              </div>
              
              <button 
                type="button"
                onClick={handleCloseModal}
                className="text-[#6C7278] hover:text-[#B8422E] p-1 cursor-pointer transition-colors"
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
                  <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block border-b border-[#6C7278]/25 pb-1">
                    Detailed Description
                  </span>
                  
                  {isEditingTask ? (
                    <textarea
                      value={editTaskDesc}
                      onChange={(e) => setEditTaskDesc(e.target.value)}
                      rows={4}
                      className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-2 text-sm text-[#1A1C1E] focus:outline-none font-sans"
                    />
                  ) : (
                    <p className="text-sm text-[#2C2D30] leading-relaxed whitespace-pre-wrap font-sans">
                      {activeTask.description || <span className="text-stone-400 italic">No description provided for this task.</span>}
                    </p>
                  )}
                </div>

                {/* Subtasks Section */}
                <div className="space-y-4">
                  <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block border-b border-[#6C7278]/25 pb-1">
                    Subtasks
                  </span>
                  
                  {/* Subtasks List */}
                  {(() => {
                    const subtasks = tasks.filter((sub) => sub.parent_task_id === activeTask.id);
                    return (
                      <div className="space-y-2">
                        {subtasks.length > 0 ? (
                          subtasks.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between p-2.5 bg-[#F7F5F2] border border-[#6C7278]/20 rounded-sm">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={sub.status === 'done'}
                                  onChange={() => updateTaskStatus(sub.id, sub.status === 'done' ? 'todo' : 'done')}
                                  className="h-4 w-4 accent-[#B8422E] shrink-0 cursor-pointer"
                                />
                                <span className={`text-sm text-[#1A1C1E] font-medium truncate ${sub.status === 'done' ? 'line-through text-[#6C7278]' : ''}`}>
                                  {sub.name}
                                </span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => deleteTask(sub.id)}
                                className="text-stone-400 hover:text-[#B8422E] p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-stone-400 italic font-sans py-1">No subtasks created yet.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Add Subtask Form */}
                  <form onSubmit={handleAddSubtaskFromModal} className="flex items-stretch gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Create a new subtask..."
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-3 py-1.5 text-xs text-[#1A1C1E] focus:border-[#1A1C1E] focus:outline-none rounded-sm font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskName.trim()}
                      className="bg-[#1A1C1E] text-white hover:bg-[#B8422E] font-label text-[10px] uppercase font-bold px-3 py-1.5 rounded-sm disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

                {/* Blockers & Dependencies */}
                {activeTask.dependencies && activeTask.dependencies.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block border-b border-[#6C7278]/25 pb-1">
                      Dependencies (Blocks this task)
                    </span>
                    <div className="space-y-1.5">
                      {activeTask.dependencies.map((depId) => {
                        const depTask = tasks.find((t) => t.id === depId);
                        if (!depTask) return null;
                        const isDone = depTask.status === 'done';
                        return (
                          <div key={depId} className="flex items-center space-x-2 text-xs font-sans text-[#2C2D30]">
                            <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-green-600' : 'bg-[#B8422E]'}`}></span>
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
          <div className="space-y-5 bg-[#F7F5F2]/40 border-t md:border-t-0 md:border-l border-[#6C7278]/20 pt-5 md:pt-0 md:pl-5">
            {/* Status Edit */}
            <div className="space-y-1">
              <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                Status
              </label>
              <select
                value={activeTask.status}
                onChange={(e) => updateTaskStatus(activeTask.id, e.target.value as Task['status'])}
                className="w-full bg-white border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo Queue</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done Log</option>
              </select>
            </div>

            {/* Priority Edit */}
            <div className="space-y-1">
              <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                Priority
              </label>
              {isEditingTask ? (
                <select
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value as Task['priority'])}
                  className="w-full bg-white border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              ) : (
                <span className={`inline-block font-label text-[10px] font-bold border px-2 py-0.5 uppercase tracking-wide rounded-[2px] ${
                  activeTask.priority === 'high'
                    ? 'border-[#B8422E]/40 text-[#B8422E] bg-[#B8422E]/5'
                    : 'border-[#6C7278]/40 text-[#6C7278] bg-white'
                }`}>
                  {activeTask.priority}
                </span>
              )}
            </div>

            {/* Project Selector (Edit Mode Only) */}
            {isEditingTask && (
              <div className="space-y-1">
                <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                  Project
                </label>
                <select
                  value={editTaskProjId}
                  onChange={(e) => setEditTaskProjId(e.target.value)}
                  className="w-full bg-white border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
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
                <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                  Category
                </label>
                <select
                  value={editTaskCategory}
                  onChange={(e) => setEditTaskCategory(e.target.value as Task['category'])}
                  className="w-full bg-white border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
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
              <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                Due Date
              </label>
              {isEditingTask ? (
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="w-full bg-white border border-[#6C7278]/40 px-2 py-1 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
                />
              ) : (
                <span className="text-xs text-[#1A1C1E] font-medium font-sans">
                  {activeTask.due_date 
                    ? new Date(activeTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="text-stone-400 italic">No deadline set</span>
                  }
                </span>
              )}
            </div>

            {/* Recurring Option */}
            <div className="space-y-1">
              <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                Recurring Frequency
              </label>
              {isEditingTask ? (
                <select
                  value={editTaskRecurring}
                  onChange={(e) => setEditTaskRecurring(e.target.value as Task['recurring'])}
                  className="w-full bg-white border border-[#6C7278]/40 px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none font-sans rounded-[2px]"
                >
                  <option value="none">One Time</option>
                  <option value="daily">Daily Reset</option>
                  <option value="weekly">Weekly Reset</option>
                  <option value="monthly">Monthly Reset</option>
                </select>
              ) : (
                <span className="text-xs text-[#1A1C1E] font-medium uppercase font-label">
                  {activeTask.recurring !== 'none' ? `${activeTask.recurring} reset` : 'One-time task'}
                </span>
              )}
            </div>

            {/* Pomodoro Focus Sessions */}
            <div className="space-y-2 border-t border-[#6C7278]/25 pt-3">
              <label className="font-label text-[10px] text-[#6C7278] uppercase tracking-wider font-bold block">
                Focus Sessions
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-[#1A1C1E] font-sans">
                  <Timer className="h-4.5 w-4.5 text-[#B8422E]" />
                  <span className="text-sm font-semibold">{activeTask.pomodoro_sessions || 0} sessions</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateTaskPomodoro(activeTask.id, (activeTask.pomodoro_sessions || 0) + 1)}
                  className="bg-white border border-[#6C7278]/40 hover:bg-[#F7F5F2] hover:border-[#1A1C1E] font-label text-[9px] font-bold uppercase tracking-wider px-2 py-1 transition-all rounded-sm cursor-pointer flex items-center space-x-1"
                >
                  <span>+1 Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#6C7278]/25 p-4 bg-[#F7F5F2]/30 flex flex-wrap justify-between items-center gap-3 font-label text-[10px] uppercase font-bold">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => togglePinTask(activeTask.id)}
              className={`px-3 py-1.5 border rounded-sm cursor-pointer flex items-center space-x-1 transition-all ${
                activeTask.is_pinned 
                  ? 'bg-[#B8422E]/10 border-[#B8422E] text-[#B8422E]' 
                  : 'bg-white border-[#6C7278]/40 text-[#6C7278] hover:border-[#1A1C1E] hover:text-[#1A1C1E]'
              }`}
            >
              <Pin className="h-3 w-3 fill-current" />
              <span>{activeTask.is_pinned ? 'Pinned' : 'Pin Task'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to delete this task?')) {
                  deleteTask(activeTask.id);
                  handleCloseModal();
                }
              }}
              className="px-3 py-1.5 bg-white border border-red-200 hover:border-red-600 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer transition-all flex items-center space-x-1"
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
                  className="px-4 py-1.5 bg-[#1A1C1E] text-white hover:bg-green-700 rounded-sm cursor-pointer transition-all"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTask(false)}
                  className="px-4 py-1.5 bg-white border border-[#6C7278]/40 hover:bg-[#F7F5F2] text-[#1A1C1E] rounded-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTask(true)}
                className="px-4 py-1.5 bg-white border border-[#6C7278]/40 hover:bg-[#F7F5F2] hover:border-[#1A1C1E] text-[#1A1C1E] rounded-sm cursor-pointer transition-all"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
}
