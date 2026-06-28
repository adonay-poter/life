'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDashboard, Task, Project } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';
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
  X,
  Play,
  FolderKanban,
  SlidersHorizontal,
  Inbox
} from 'lucide-react';

function TasksContent() {
  const dragCounters = useRef<Record<string, number>>({});
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    projects,
    tasks,
    inboxItems,
    loading,
    addTask,
    updateTask,
    updateTaskStatus,
    updateTaskPomodoro,
    togglePinTask,
    deleteTask
  } = useDashboard();

  const { showToast } = useToast();

  // Delete confirmation modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);

  const triggerDeleteTask = (id: string, name: string) => {
    setTaskToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const searchParams = useSearchParams();
  const initialTab = searchParams ? (searchParams.get('tab') as 'kanban' | 'calendar' | 'today') : null;

  // Tab State
  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'today'>('kanban');

  // Category & Priority & Project Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('All');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount (hydration safe)
  useEffect(() => {
    const storedTab = localStorage.getItem('tasks_active_tab');
    if (storedTab) {
      const tabParam = searchParams ? searchParams.get('tab') : null;
      if (!tabParam) {
        setActiveTab(storedTab as any);
      }
    }
    const storedCat = localStorage.getItem('tasks_filter_category');
    if (storedCat) setSelectedCategory(storedCat);
    const storedPriority = localStorage.getItem('tasks_filter_priority');
    if (storedPriority) setSelectedPriorityFilter(storedPriority);
    const storedProj = localStorage.getItem('tasks_filter_project');
    if (storedProj) setSelectedProjectFilter(storedProj);
    
    setIsLoaded(true);
  }, [searchParams]);

  // Sync tab with search parameters on deep links
  useEffect(() => {
    const tabParam = searchParams ? searchParams.get('tab') : null;
    if (tabParam === 'kanban' || tabParam === 'calendar' || tabParam === 'today') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Persist to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tasks_active_tab', activeTab);
  }, [activeTab, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tasks_filter_category', selectedCategory);
  }, [selectedCategory, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tasks_filter_priority', selectedPriorityFilter);
  }, [selectedPriorityFilter, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tasks_filter_project', selectedProjectFilter);
  }, [selectedProjectFilter, isLoaded]);

  // Pomodoro timer focus session triggers
  const handleStartFocusSession = (taskId: string) => {
    localStorage.setItem('pomodoro_activeTaskId', taskId);
    localStorage.setItem('pomodoro_isRunning', 'true');
    localStorage.setItem('pomodoro_timeRemaining', '1500'); // 25 mins
    localStorage.setItem('pomodoro_isBreak', 'false');
    window.dispatchEvent(new Event('pomodoro_sync'));
    showToast('Focus session started for task.', 'success');
  };

  // Undoable status updates
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const openTaskModal = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleCloseModal = () => {
    setSelectedTaskId(null);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setDeleteModalOpen(false);
        setShowAddTask(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddTask, deleteModalOpen]);

  // ==========================================
  // FORM SUBMISSION HANDLERS
  // ==========================================
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      showToast('Task name cannot be empty.', 'error');
      return;
    }
    
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

    showToast('Task created successfully.', 'success');

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
      await handleUpdateTaskStatusWithUndo(id, status);
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
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (selectedPriorityFilter !== 'All' && t.priority !== selectedPriorityFilter) return false;
    if (selectedProjectFilter !== 'All' && t.project_id !== selectedProjectFilter) return false;
    return true;
  });

  const renderCalendarGrid = () => {
    const { numDays, startDay } = getDaysInMonth(currentDate);
    const dayCells = [];

    // Empty cells for padding start of month
    for (let i = 0; i < startDay; i++) {
      dayCells.push(<div key={`empty-${i}`} className="bg-neutral-bg/20 border border-secondary/20 min-h-[70px] md:min-h-[100px] p-1"></div>);
    }

    // Days cells
    for (let day = 1; day <= numDays; day++) {
      const cellDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const dayTasks = filteredTasks.filter((t) => {
        return t.due_date && getLocalDateString(new Date(t.due_date)) === cellDateStr;
      });

      const handleCellClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          setNewTaskDueDate(cellDateStr);
          setShowAddTask(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`Task date pre-set to ${cellDateStr}.`, 'info');
        }
      };

      dayCells.push(
        <div 
          key={`day-${day}`} 
          onClick={handleCellClick}
          className="bg-surface border border-secondary/30 min-h-[70px] md:min-h-[100px] p-2 flex flex-col justify-between rounded-sm cursor-pointer hover:bg-neutral-bg/45"
        >
          <span className="font-label text-xs font-bold text-secondary pointer-events-none">{day}</span>
          <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[60px]">
            {dayTasks.map((t) => (
              <div
                key={t.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateTaskStatusWithUndo(t.id, t.status === 'done' ? 'todo' : 'done');
                }}
                className={`text-[9px] px-1 py-0.5 font-sans truncate cursor-pointer border rounded-[2px] ${
                  t.status === 'done'
                    ? 'bg-secondary/10 text-secondary line-through border-transparent'
                    : 'bg-tertiary/10 text-tertiary border-tertiary/20'
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
    { name: 'Done Log', status: 'done' }
  ];

  // Today Focus tasks (Overdue or Due Today, or Pinned)
  const todayStr = getLocalDateString();
  const todayTasks = filteredTasks.filter((t) => {
    const isDueToday = t.due_date && getLocalDateString(new Date(t.due_date)) === todayStr;
    const isOverdue = t.due_date && new Date(t.due_date) < new Date(todayStr) && getLocalDateString(new Date(t.due_date)) !== todayStr;
    return isDueToday || isOverdue || t.is_pinned;
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <header className="border-b-2 border-secondary/20 pb-4">
          <div className="h-8 bg-secondary/15 w-48 rounded-sm mb-2" />
          <div className="h-4 bg-secondary/10 w-80 rounded-sm" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="bg-neutral-bg border border-secondary/25 p-4 rounded-sm space-y-4">
              <div className="h-4 bg-secondary/20 w-1/2 rounded-sm" />
              {[1, 2].map((card) => (
                <div key={card} className="bg-surface border border-secondary/15 p-4 rounded-sm space-y-2">
                  <div className="h-4 bg-secondary/15 w-3/4 rounded-sm" />
                  <div className="h-3 bg-secondary/10 w-1/2 rounded-sm" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b-2 border-primary pb-4 flex flex-col sm:flex-row justify-between items-baseline gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
            TASKS & SCHEDULES
          </h2>
          <p className="font-label text-xs text-secondary uppercase tracking-[0.2em] mt-0.5">
            Operational Throughput &bull; Categorized Action Engines
          </p>
        </div>

        {/* View Selection Tabs */}
        <div className="flex border border-secondary font-label text-xs uppercase tracking-wider select-none shrink-0 self-end">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'kanban' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all border-l border-r border-secondary cursor-pointer ${
              activeTab === 'calendar' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Calendar View</span>
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'today' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Today Focus</span>
          </button>
        </div>
      </header>

      {/* Global Toolbar: Filters & Quick Actions */}
      <div className="flex flex-col gap-4 bg-surface border border-secondary/25 p-4 rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-label text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-secondary" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-neutral-bg border border-secondary/30 px-3.5 py-2 md:px-2.5 md:py-1 focus:outline-none text-xs md:text-[11px] font-bold uppercase rounded-sm cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Urgent">Urgent</option>
                <option value="Learning">Learning</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-secondary" />
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="bg-neutral-bg border border-secondary/30 px-3.5 py-2 md:px-2.5 md:py-1 focus:outline-none text-xs md:text-[11px] font-bold uppercase rounded-sm cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Project Filter */}
            <div className="flex items-center space-x-2">
              <FolderKanban className="h-4 w-4 text-secondary" />
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="bg-neutral-bg border border-secondary/30 px-3.5 py-2 md:px-2.5 md:py-1 focus:outline-none text-xs md:text-[11px] font-bold uppercase rounded-sm cursor-pointer"
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="btn-tertiary flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>CREATE NEW TASK</span>
          </button>
        </div>
      </div>

      {/* Inline Add Task Drawer */}
      {showAddTask && (
        <form onSubmit={handleAddTaskSubmit} className="bg-surface border border-secondary p-6 rounded-sm space-y-4 font-label text-xs">
          <span className="block font-bold text-sm uppercase text-primary border-b border-secondary/20 pb-2">
            Configure New Task
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Assign to Project</label>
              <select
                value={newTaskProjId}
                onChange={(e) => {
                  setNewTaskProjId(e.target.value);
                  setNewTaskParentId('');
                  setNewTaskDepIds([]);
                }}
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none"
              >
                <option value="">-- Standalone Task (None) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Task Category *</label>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as Task['category'])}
                required
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Urgent">Urgent</option>
                <option value="Learning">Learning</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Task Name *</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Brief description of work"
                required
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase text-secondary">Detailed Description</label>
            <textarea
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              rows={2}
              className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Priority Level</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none"
              >
                <option value="high">High (Weight: 3)</option>
                <option value="medium">Medium (Weight: 2)</option>
                <option value="low">Low (Weight: 1)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Due Date</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Recurring Reset</label>
              <select
                value={newTaskRecurring}
                onChange={(e) => setNewTaskRecurring(e.target.value as Task['recurring'])}
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none"
              >
                <option value="none">One Time</option>
                <option value="daily">Daily Reset</option>
                <option value="weekly">Weekly Reset</option>
                <option value="monthly">Monthly Reset</option>
              </select>
            </div>
          </div>

          {/* Subtask & Dependency options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-secondary/25">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Parent Task (For Subtask)</label>
              <select
                value={newTaskParentId}
                onChange={(e) => setNewTaskParentId(e.target.value)}
                className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none"
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
              <label className="block text-xs uppercase text-secondary">Blocked By (Dependency)</label>
              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto border border-secondary/30 bg-neutral-bg p-2 rounded-sm">
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
                        className={`font-label text-xs px-2 py-1 uppercase tracking-wide border rounded-[2px] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary font-bold'
                            : 'bg-surface text-primary border-secondary/25 hover:bg-neutral-bg'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                {tasks.filter((t) => t.project_id === (newTaskProjId || undefined) && t.status !== 'done').length === 0 && (
                  <span className="font-sans text-xs text-secondary italic">No active tasks in this project.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={!newTaskName}
              className="flex-1 bg-primary text-on-primary py-2 uppercase tracking-wider text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={() => setShowAddTask(false)}
              className="px-4 py-2 border border-secondary text-primary hover:bg-neutral-bg uppercase tracking-wider text-xs cursor-pointer"
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
          <div className="flex md:hidden border border-secondary font-label text-xs uppercase tracking-wider mb-4 overflow-x-auto rounded-sm">
            {kanbanColumns.map((col) => {
              // Custom cleaner mobile name
              const mobileName = col.status === 'in_progress' ? 'Progress' : col.status === 'done' ? 'Done' : col.name.split(' ')[0];
              return (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => setActiveKanbanColumn(col.status)}
                  className={`flex-1 min-w-[85px] py-3 text-center border-r border-secondary last:border-r-0 font-bold transition-all ${
                    activeKanbanColumn === col.status ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                  }`}
                >
                  {mobileName}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:grid md:grid-cols-4 gap-4 pb-4">
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
                  className={`bg-surface border p-4 rounded-sm flex flex-col min-h-[400px] md:min-h-[500px] transition-all duration-200 relative ${
                    isDraggedOver ? 'border-dashed border-primary bg-neutral-bg/50 scale-[1.01]' : 'border-secondary/40'
                  } ${
                    isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  <span className="font-label text-xs text-primary uppercase tracking-[0.1em] block border-b border-secondary/25 pb-2 mb-3 font-bold">
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
                          className="bg-neutral-bg border border-secondary/30 p-3.5 rounded-[2px] cursor-pointer hover:border-primary hover:bg-neutral-bg/90 relative group transition-all"
                        >
                          {/* Project Name and Category Tags */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span 
                              className="font-label text-xs text-white px-1.5 py-0.5 uppercase tracking-wide block w-fit font-bold rounded-[2px]"
                              style={{ backgroundColor: parentProject?.color || '#6C7278' }}
                            >
                              {parentProject ? parentProject.name : 'Standalone'}
                            </span>
                            {task.category && (
                              <span className="font-label text-xs text-tertiary bg-tertiary/10 border border-tertiary/25 px-1.5 py-0.5 uppercase tracking-wide block w-fit font-bold rounded-[2px]">
                                {task.category}
                              </span>
                            )}
                          </div>

                          {/* Task name */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              {task.status !== 'done' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartFocusSession(task.id);
                                  }}
                                  className="text-secondary hover:text-tertiary cursor-pointer"
                                  title="Start Focus Session"
                                >
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                </button>
                              )}
                              <h6 className="font-sans text-sm font-semibold text-primary leading-snug">
                                {task.name}
                              </h6>
                            </div>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinTask(task.id);
                                showToast(`Task ${task.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                              }}
                              className={`text-xs shrink-0 ml-1.5 cursor-pointer ${task.is_pinned ? 'text-tertiary' : 'text-secondary opacity-0 group-hover:opacity-100'}`}
                            >
                              <Pin className="h-3 w-3 fill-current" />
                            </button>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="font-sans text-xs text-primary mt-1.5 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Inbox Origin link */}
                          {task.inbox_item_id && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                const origin = inboxItems.find(item => item.id === task.inbox_item_id);
                                window.location.href = `/inbox?searchQuery=${encodeURIComponent(origin?.title || '')}`;
                              }}
                              className="mt-2.5 flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider text-secondary hover:text-tertiary transition-colors cursor-pointer select-none border border-secondary/25 px-1.5 py-0.5 rounded-sm bg-neutral-bg/55 self-start"
                              title="Trace back to originating Inbox Item"
                            >
                              <Inbox className="h-3 w-3 text-tertiary shrink-0" />
                              <span>Inbox Origin</span>
                            </div>
                          )}

                          {/* Warnings / Blocks */}
                          {isBlocked && (
                            <div className="mt-2 flex items-center space-x-1 text-tertiary">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-label text-xs uppercase tracking-wider font-bold">Blocked (depends unresolved)</span>
                            </div>
                          )}

                          {/* Subtask progress */}
                          {subtasks.length > 0 && (
                            <div className="mt-2.5 space-y-1.5 border-t border-secondary/15 pt-2">
                              <span className="font-label text-xs uppercase text-secondary tracking-wider block font-bold">
                                Subtasks ({subtasks.filter(s => s.status === 'done').length}/{subtasks.length})
                              </span>
                              <div className="space-y-1 bg-surface/40 p-1.5 rounded-sm">
                                {subtasks.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between text-xs font-sans text-primary py-0.5">
                                    <span className={sub.status === 'done' ? 'line-through text-secondary' : ''}>{sub.name}</span>
                                    <input
                                      type="checkbox"
                                      checked={sub.status === 'done'}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleUpdateTaskStatusWithUndo(sub.id, sub.status === 'done' ? 'todo' : 'done');
                                      }}
                                      className="h-3.5 w-3.5 accent-tertiary cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bottom footer details */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-secondary/15">
                            <span className="font-label text-xs bg-surface border border-secondary/30 px-1.5 py-0.2 uppercase text-secondary font-bold rounded-[2px]">
                              {task.priority}
                            </span>

                            {/* Pomodoro sessions count */}
                            <div className="flex items-center space-x-1.5 text-xs text-primary font-sans" title="Pomodoro focused sessions">
                              <Timer className="h-3.5 w-3.5 text-tertiary" />
                              <span>{task.pomodoro_sessions || 0}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDeleteTask(task.id, task.name);
                              }}
                              className="text-stone-400 hover:text-tertiary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Mobile Card Move Actions Dropdown */}
                          <div className="mt-2.5 pt-2 border-t border-secondary/15 flex items-center justify-between md:hidden font-label text-[9px]">
                            <span className="text-secondary uppercase font-bold">Move status:</span>
                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateTaskStatusWithUndo(task.id, e.target.value as Task['status']);
                              }}
                              className="bg-neutral-bg border border-secondary px-1.5 py-0.5 text-[10px] text-primary focus:outline-none font-sans rounded-[2px]"
                            >
                              <option value="backlog">Backlog</option>
                              <option value="todo">Todo</option>
                              <option value="in_progress">In Progress</option>
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
          <div className="hidden md:block bg-surface border border-secondary p-6 rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-display text-lg font-bold text-primary uppercase tracking-wide">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-2 font-label text-xs">
                <button onClick={() => changeMonth(-1)} className="px-2.5 py-1 border border-secondary hover:bg-neutral-bg uppercase cursor-pointer">
                  &larr; Prev
                </button>
                <button onClick={() => changeMonth(1)} className="px-2.5 py-1 border border-secondary hover:bg-neutral-bg uppercase cursor-pointer">
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-label text-xs text-secondary uppercase tracking-wider mb-2 font-bold select-none">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 bg-secondary/20 border border-secondary/20">
              {renderCalendarGrid()}
            </div>
          </div>

          {/* MOBILE CALENDAR & AGENDA VIEW */}
          <div className="block md:hidden bg-surface border border-secondary p-4 rounded-sm space-y-4">
            <div className="flex justify-between items-center border-b border-secondary/20 pb-2.5 mb-2">
              <h4 className="font-display text-sm font-bold text-primary uppercase tracking-wide">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex space-x-1.5 font-label text-xs">
                <button onClick={() => changeMonth(-1)} className="px-2.5 py-1 border border-secondary hover:bg-neutral-bg uppercase font-bold">
                  &larr; PREV
                </button>
                <button onClick={() => changeMonth(1)} className="px-2.5 py-1 border border-secondary hover:bg-neutral-bg uppercase font-bold">
                  NEXT &rarr;
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-label text-xs text-secondary uppercase tracking-wider font-bold select-none">
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
                        ? 'bg-primary text-on-primary border border-primary'
                        : 'bg-surface border border-secondary/20 text-primary hover:bg-neutral-bg'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {hasTasks && (
                      <span className={`h-1.5 w-1.5 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-surface' : 'bg-tertiary'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Agenda List */}
            <div className="mt-4 pt-4 border-t border-secondary/20 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.1em] font-bold">
                  Day Agenda
                </span>
                <span className="font-label text-xs text-tertiary font-bold">
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
                          className="flex items-center justify-between p-3.5 bg-neutral-bg border border-secondary/25 hover:border-primary rounded-sm cursor-pointer transition-all"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.status === 'done'}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done');
                              }}
                              className="h-4.5 w-4.5 accent-tertiary shrink-0 cursor-pointer"
                            />
                            {task.status !== 'done' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFocusSession(task.id);
                                }}
                                className="text-secondary hover:text-tertiary cursor-pointer"
                                title="Start Focus Session"
                              >
                                <Play className="h-4.5 w-4.5 fill-current" />
                              </button>
                            )}
                            <div className="min-w-0">
                              <span className={`font-sans text-sm font-semibold text-primary block truncate ${task.status === 'done' ? 'line-through text-secondary' : ''}`}>
                                {task.name}
                              </span>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-label text-xs text-secondary uppercase tracking-wider font-semibold">
                                  {parentProject ? parentProject.name : 'Standalone'}
                                </span>
                                {task.category && (
                                  <span className="font-label text-xs text-tertiary uppercase font-bold">
                                    &bull; {task.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-label text-xs bg-surface border border-secondary/30 px-1.5 py-0.2 uppercase text-secondary font-bold rounded-[2px] shrink-0">
                            {task.priority}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <p className="font-sans text-xs text-secondary italic text-center py-5 bg-neutral-bg/30 border border-dashed border-secondary/25 rounded-sm">
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
        <div className="bg-surface border border-secondary p-6 rounded-sm space-y-6">
          <span className="font-label text-xs text-primary uppercase tracking-[0.15em] block mb-2 border-b border-secondary/20 pb-1.5 font-bold">
            Tasks Scheduled for Today or Pinned
          </span>

          <div className="space-y-3.5">
            {sortedTodayTasks.length > 0 ? (
              sortedTodayTasks.map((task) => {
                const parentProject = projects.find((p) => p.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskModal(task)}
                    className="flex items-center justify-between p-4 bg-neutral-bg border border-secondary/30 hover:border-primary rounded-sm group cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="h-4.5 w-4.5 accent-tertiary shrink-0 cursor-pointer"
                      />
                      {task.status !== 'done' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartFocusSession(task.id);
                          }}
                          className="text-secondary hover:text-tertiary cursor-pointer"
                          title="Start Focus Session"
                        >
                          <Play className="h-4.5 w-4.5 fill-current" />
                        </button>
                      )}
                      <div>
                        <span className={`font-sans text-sm font-semibold text-primary ${task.status === 'done' ? 'line-through text-secondary' : ''}`}>
                          {task.name}
                        </span>
                        {task.description && (
                          <p className="font-sans text-xs text-primary mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2 font-label text-xs">
                          <span className="bg-surface border border-secondary/25 px-1.5 py-0.2 text-secondary font-bold rounded-[2px]">
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="text-secondary uppercase font-semibold">
                            {parentProject ? parentProject.name : 'STANDALONE'}
                          </span>
                          {task.category && (
                            <span className="text-tertiary bg-tertiary/10 px-1.5 py-0.2 font-bold rounded-[2px]">
                              {task.category.toUpperCase()}
                            </span>
                          )}
                          {task.recurring !== 'none' && (
                            <span className="text-tertiary font-bold">
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
                          showToast(`Task ${task.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                        }}
                        className={`text-xs cursor-pointer p-1 ${task.is_pinned ? 'text-tertiary' : 'text-stone-300 hover:text-secondary'}`}
                      >
                        <Pin className="h-4.5 w-4.5 fill-current" />
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerDeleteTask(task.id, task.name);
                        }}
                        className="text-stone-300 hover:text-tertiary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="font-sans text-xs text-secondary italic text-center py-12">No focus tasks active for today.</p>
            )}
          </div>
        </div>
      )}

      {/* Task Details Dialog Popup */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

    {/* Delete Confirmation Modal */}
    <ConfirmDeleteModal
      isOpen={deleteModalOpen}
      onClose={() => {
        setDeleteModalOpen(false);
        setTaskToDelete(null);
      }}
      onConfirm={async () => {
        if (taskToDelete) {
          await deleteTask(taskToDelete.id);
          showToast('Task deleted successfully.', 'info');
          if (selectedTaskId === taskToDelete.id) {
            handleCloseModal();
          }
        }
      }}
      itemName={taskToDelete?.name || ''}
      itemType="task"
    />
  </div>
);
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="bg-surface border border-secondary/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-secondary italic">Loading Tasks Workspace...</p>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
