'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboard, Task } from '@/context/DashboardContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Grip,
  Inbox,
  Layers,
  Pin,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Timer,
  Trash2,
  X
} from 'lucide-react';

import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import StatusBadge from '@/components/ui/StatusBadge';

const STATUS_META: Array<{
  status: Task['status'];
  name: string;
  shortName: string;
  accent: string;
  surface: string;
}> = [
  { status: 'backlog', name: 'Backlog', shortName: 'Backlog', accent: 'text-secondary', surface: 'border-border bg-background' },
  { status: 'todo', name: 'To Do', shortName: 'To Do', accent: 'text-primary', surface: 'border-primary/20 bg-primary/5' },
  { status: 'in_progress', name: 'In Progress', shortName: 'Progress', accent: 'text-accent', surface: 'border-accent/25 bg-accent/8' },
  { status: 'done', name: 'Done', shortName: 'Done', accent: 'text-success', surface: 'border-success/20 bg-success/8' }
];

const CATEGORY_OPTIONS: Array<'All' | NonNullable<Task['category']>> = ['All', 'Work', 'Personal', 'Urgent', 'Learning', 'Other'];
const PRIORITY_OPTIONS: Array<'All' | Task['priority']> = ['All', 'high', 'medium', 'low'];
const RECURRING_OPTIONS: Task['recurring'][] = ['none', 'daily', 'weekly', 'monthly'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function normalizeDueDateForInput(value?: string) {
  return value ? getLocalDateString(new Date(value)) : '';
}

function toStoredDueDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`).toISOString();
}

function formatMonthHeading(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatLongDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function getPriorityWeight(priority: Task['priority']) {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
}

function getPriorityLabel(priority: Task['priority']) {
  return priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low';
}

function getDateTone(dateStr?: string, todayStr?: string) {
  if (!dateStr || !todayStr) return 'text-secondary';
  if (dateStr < todayStr) return 'text-danger';
  if (dateStr === todayStr) return 'text-accent';
  return 'text-secondary';
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  return { numDays, startDay };
}

function buildDateString(date: Date, day: number) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function TasksContent() {
  const dragCounters = useRef<Record<string, number>>({});
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    projects,
    tasks,
    inboxItems,
    loading,
    addTask,
    updateTask,
    updateTaskStatus,
    togglePinTask,
    deleteTask
  } = useDashboard();

  const { showToast } = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'today'>('kanban');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('All');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeKanbanColumn, setActiveKanbanColumn] = useState<Task['status']>('todo');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getLocalDateString());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAdvancedAddTask, setShowAdvancedAddTask] = useState(false);
  const [newTaskProjId, setNewTaskProjId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskRecurring, setNewTaskRecurring] = useState<Task['recurring']>('none');
  const [newTaskParentId, setNewTaskParentId] = useState('');
  const [newTaskDepIds, setNewTaskDepIds] = useState<string[]>([]);
  const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('Work');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<Task['status'] | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneSortBy, setDoneSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'name'>('date_desc');
  const [doneFilterCategory, setDoneFilterCategory] = useState<'All' | Task['category']>('All');

  useEffect(() => {
    const storedTab = localStorage.getItem('tasks_active_tab');
    if (storedTab && !searchParams?.get('tab')) {
      setActiveTab(storedTab as typeof activeTab);
    }

    const storedCat = localStorage.getItem('tasks_filter_category');
    const storedPriority = localStorage.getItem('tasks_filter_priority');
    const storedProj = localStorage.getItem('tasks_filter_project');
    const storedSearch = localStorage.getItem('tasks_search_query');

    if (storedCat) setSelectedCategory(storedCat);
    if (storedPriority) setSelectedPriorityFilter(storedPriority);
    if (storedProj) setSelectedProjectFilter(storedProj);
    if (storedSearch) setSearchQuery(storedSearch);

    setIsLoaded(true);
  }, [searchParams]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'kanban' || tabParam === 'calendar' || tabParam === 'today') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('tasks_active_tab', activeTab);
    localStorage.setItem('tasks_filter_category', selectedCategory);
    localStorage.setItem('tasks_filter_priority', selectedPriorityFilter);
    localStorage.setItem('tasks_filter_project', selectedProjectFilter);
    localStorage.setItem('tasks_search_query', searchQuery);
  }, [activeTab, isLoaded, searchQuery, selectedCategory, selectedPriorityFilter, selectedProjectFilter]);

  useEffect(() => {
    const handleTrigger = () => {
      setShowAddTask(true);
      setShowAdvancedAddTask(false);
      setNewTaskDueDate(selectedCalendarDate || getLocalDateString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('trigger_add_task', handleTrigger);
    return () => window.removeEventListener('trigger_add_task', handleTrigger);
  }, [selectedCalendarDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setDeleteModalOpen(false);
        setShowAddTask(false);
        setShowDoneModal(false);
        setShowMobileFilters(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openTaskModal = (task: Task) => setSelectedTaskId(task.id);

  const triggerDeleteTask = (id: string, name: string) => {
    setTaskToDelete({ id, name });
    setDeleteModalOpen(true);
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
        showToast('Recurring task advanced to next occurrence.', 'success', {
          label: 'Undo',
          onClick: async () => {
            await updateTask(taskId, { status: oldStatus, due_date: oldDueDate });
          }
        });
      }, 100);
      return;
    }

    showToast(`Task status updated to ${newStatus.replace('_', ' ')}.`, 'success', {
      label: 'Undo',
      onClick: async () => {
        await updateTaskStatus(taskId, oldStatus);
      }
    });
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      showToast('Task name cannot be empty.', 'error');
      return;
    }

    await addTask(
      newTaskProjId || undefined,
      newTaskName.trim(),
      newTaskDesc.trim() || undefined,
      newTaskPriority,
      toStoredDueDate(newTaskDueDate),
      newTaskRecurring,
      newTaskParentId || undefined,
      newTaskDepIds,
      newTaskCategory
    );

    showToast('Task created successfully.', 'success');

    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setNewTaskRecurring('none');
    setNewTaskParentId('');
    setNewTaskDepIds([]);
    setNewTaskCategory('Work');
    setNewTaskProjId('');
    setShowAdvancedAddTask(false);
    setShowAddTask(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDragEnter = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    dragCounters.current[status] = (dragCounters.current[status] || 0) + 1;
    if (dragCounters.current[status] === 1) setDraggedOverColumn(status);
  };

  const handleDragLeave = (_e: React.DragEvent, status: Task['status']) => {
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
    if (id) await handleUpdateTaskStatusWithUndo(id, status);
    setDraggedTaskId(null);
  };

  const isTaskBlocked = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some((depId) => {
      const depTask = tasks.find((t) => t.id === depId);
      return depTask && depTask.status !== 'done';
    });
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchesFilter = (task: Task) => {
      if (selectedCategory !== 'All' && task.category !== selectedCategory) return false;
      if (selectedPriorityFilter !== 'All' && task.priority !== selectedPriorityFilter) return false;
      if (selectedProjectFilter !== 'All' && task.project_id !== selectedProjectFilter) return false;
      if (!query) return true;

      const parentProject = projects.find((p) => p.id === task.project_id);
      const haystack = [
        task.name,
        task.description,
        task.category,
        task.priority,
        parentProject?.name
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    };

    return tasks.filter((task) => {
      if (matchesFilter(task)) return true;
      if (task.parent_task_id) {
        const parent = tasks.find((candidate) => candidate.id === task.parent_task_id);
        if (parent && matchesFilter(parent)) return true;
      }
      return false;
    });
  }, [projects, searchQuery, selectedCategory, selectedPriorityFilter, selectedProjectFilter, tasks]);

  const todayStr = getLocalDateString();
  const openTasks = filteredTasks.filter((t) => t.status !== 'done');
  const overdueTasks = openTasks.filter((t) => t.due_date && getLocalDateString(new Date(t.due_date)) < todayStr);
  const dueTodayTasks = openTasks.filter((t) => t.due_date && getLocalDateString(new Date(t.due_date)) === todayStr);
  const pinnedTasks = openTasks.filter((t) => t.is_pinned);
  const blockedTasks = openTasks.filter((t) => t.status === 'blocked' || isTaskBlocked(t));
  const completedTasks = filteredTasks.filter((t) => t.status === 'done');
  const completionPct = filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;
  const activeFilterCount = [selectedCategory, selectedPriorityFilter, selectedProjectFilter]
    .filter((value) => value !== 'All').length + (searchQuery.trim() ? 1 : 0);
  const activeFilterLabels = [
    selectedCategory !== 'All' ? `Category: ${selectedCategory}` : null,
    selectedPriorityFilter !== 'All' ? `Priority: ${getPriorityLabel(selectedPriorityFilter as Task['priority'])}` : null,
    selectedProjectFilter !== 'All'
      ? `Project: ${projects.find((project) => project.id === selectedProjectFilter)?.name || 'Selected'}`
      : null
  ].filter(Boolean) as string[];

  const kanbanColumns = STATUS_META;

  const statusCounts = useMemo(() => (
    STATUS_META.reduce((acc, column) => {
      acc[column.status] = filteredTasks.filter((task) => (
        !task.parent_task_id &&
        (task.status === column.status || (column.status === 'todo' && task.status === 'blocked'))
      )).length;
      return acc;
    }, {} as Record<Task['status'], number>)
  ), [filteredTasks]);

  const sortedTodayTasks = [...filteredTasks.filter((t) => {
    const dueDate = t.due_date ? getLocalDateString(new Date(t.due_date)) : '';
    return t.is_pinned || dueDate === todayStr || (dueDate && dueDate < todayStr);
  })]
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    });

  const unscheduledTasks = openTasks
    .filter((task) => !task.due_date && !task.parent_task_id)
    .sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority));

  const selectedDayTasks = filteredTasks
    .filter((task) => task.due_date && getLocalDateString(new Date(task.due_date)) === selectedCalendarDate)
    .sort((a, b) => {
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      if (getPriorityWeight(a.priority) !== getPriorityWeight(b.priority)) {
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      }
      return a.name.localeCompare(b.name);
    });

  const upcomingTasks = openTasks
    .filter((task) => task.due_date && getLocalDateString(new Date(task.due_date)) > todayStr)
    .sort((a, b) => {
      const dateA = getLocalDateString(new Date(a.due_date!));
      const dateB = getLocalDateString(new Date(b.due_date!));
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    })
    .slice(0, 6);

  const monthCells = useMemo(() => {
    const { numDays, startDay } = getDaysInMonth(currentDate);
    const cells: Array<{ key: string; dateStr?: string; day?: number }> = [];

    for (let i = 0; i < startDay; i += 1) {
      cells.push({ key: `empty-${i}` });
    }

    for (let day = 1; day <= numDays; day += 1) {
      cells.push({ key: `day-${day}`, dateStr: buildDateString(currentDate, day), day });
    }

    return cells;
  }, [currentDate]);

  const selectedDateInCurrentMonth = selectedCalendarDate.slice(0, 7) === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);

    if (!selectedDateInCurrentMonth || selectedCalendarDate.slice(0, 7) !== `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`) {
      setSelectedCalendarDate(buildDateString(nextDate, 1));
    }
  };

  const openCreateTaskModal = (presetDate?: string) => {
    setNewTaskDueDate(presetDate || '');
    setShowAddTask(true);
    setShowAdvancedAddTask(false);
  };

  const scheduleTaskDate = async (taskId: string, dateStr?: string) => {
    await updateTask(taskId, { due_date: dateStr ? toStoredDueDate(dateStr) : undefined });
    showToast(dateStr ? `Task scheduled for ${dateStr}.` : 'Task date cleared.', 'success');
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedPriorityFilter('All');
    setSelectedProjectFilter('All');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <PageShell>
        <SectionHeader
          title="Tasks & Schedules"
          subtitle="Operational Throughput • Categorized Action Engines"
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse mt-8">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="bg-surface border border-border p-4 space-y-4">
              <div className="h-4 bg-secondary/15 w-1/2" />
              {[1, 2].map((card) => (
                <div key={card} className="bg-background border border-border p-4 space-y-2">
                  <div className="h-4 bg-secondary/10 w-3/4" />
                  <div className="h-3 bg-secondary/5 w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SectionHeader
        title="Task Command"
        subtitle={`${openTasks.length} open · ${completionPct}% complete in current view`}
        action={(
          <PrimaryButton
            onClick={() => openCreateTaskModal(selectedCalendarDate)}
            className="hidden md:flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </PrimaryButton>
        )}
      />

      <section className="bg-surface border border-primary overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Due today', value: dueTodayTasks.length, icon: CalendarIcon, tone: dueTodayTasks.length > 0 ? 'text-accent' : 'text-primary' },
            { label: 'Overdue', value: overdueTasks.length, icon: AlertCircle, tone: overdueTasks.length > 0 ? 'text-danger' : 'text-primary' },
            { label: 'Pinned', value: pinnedTasks.length, icon: Pin, tone: pinnedTasks.length > 0 ? 'text-accent' : 'text-primary' },
            { label: 'Blocked', value: blockedTasks.length, icon: SlidersHorizontal, tone: blockedTasks.length > 0 ? 'text-warning' : 'text-primary' }
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="min-h-28 border-b border-r border-border even:border-r-0 md:even:border-r md:last:border-r-0 md:border-b-0 p-4 flex flex-col justify-between">
                <Icon className={`h-4 w-4 ${metric.tone}`} />
                <div>
                  <div className={`font-display text-3xl font-bold ${metric.tone}`}>{metric.value}</div>
                  <div className="font-label text-[10px] text-secondary uppercase tracking-[0.16em]">{metric.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-3 md:p-4 space-y-4">
          <div className="grid grid-cols-3 border border-border bg-neutral-bg font-label text-[10px] md:text-xs uppercase tracking-wider font-bold">
            {[
              { key: 'today', label: 'Today', icon: CheckSquare },
              { key: 'kanban', label: 'Board', icon: Layers },
              { key: 'calendar', label: 'Calendar', icon: CalendarIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`py-3 px-2 flex items-center justify-center gap-1.5 border-r border-border last:border-r-0 transition-all cursor-pointer btn-press ${
                    activeTab === tab.key ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 font-label text-xs">
            <div className="flex gap-2 md:hidden">
              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-2 flex-1">
                <Search className="h-4 w-4 text-secondary shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, descriptions, projects"
                  className="w-full bg-transparent text-primary font-sans focus:outline-none placeholder:text-secondary/60"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="border border-border px-3 py-2 text-primary hover:border-primary transition-colors uppercase font-bold cursor-pointer btn-press flex items-center gap-2 shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>
            </div>

            <div className="hidden md:grid md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto] gap-3">
              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-2">
                <Search className="h-4 w-4 text-secondary shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, descriptions, projects"
                  className="w-full bg-transparent text-primary font-sans focus:outline-none placeholder:text-secondary/60"
                />
              </label>

              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-2">
                <Tag className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'All Categories' : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-2">
                <SlidersHorizontal className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedPriorityFilter}
                  onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'All Priorities' : getPriorityLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-2">
                <FolderKanban className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  <option value="All">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="border border-border px-4 py-2 text-primary disabled:text-secondary/50 disabled:cursor-not-allowed hover:border-primary transition-colors uppercase font-bold cursor-pointer btn-press"
              >
                Reset {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
            </div>

            <div className="md:hidden text-[11px] text-secondary min-h-[1rem]">
              {activeFilterLabels.length > 0 ? activeFilterLabels.join(' • ') : 'No filters applied'}
            </div>
          </div>
        </div>
      </section>

      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] p-4 pb-[calc(4.25rem+env(safe-area-inset-bottom)+1rem)] md:hidden flex items-end">
          <div className="w-full bg-surface border border-border shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neutral-bg/50">
              <div>
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Task Filters</div>
                <h3 className="font-display text-lg text-primary font-bold">Adjust the task view</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer btn-press"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-label text-xs">
              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-3">
                <Tag className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'All Categories' : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-3">
                <SlidersHorizontal className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedPriorityFilter}
                  onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'All Priorities' : getPriorityLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 bg-neutral-bg border border-border px-3 py-3">
                <FolderKanban className="h-4 w-4 text-secondary shrink-0" />
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs font-bold uppercase cursor-pointer text-primary"
                >
                  <option value="All">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-t border-border">
              <SecondaryButton type="button" onClick={resetFilters} disabled={activeFilterCount === 0}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="button" onClick={() => setShowMobileFilters(false)}>
                Apply
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px] p-4 flex items-center justify-center">
          <form
            onSubmit={handleAddTaskSubmit}
            className="w-full max-w-xl bg-surface border border-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-neutral-bg/50">
              <div>
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Create Task</div>
                <h3 className="font-display text-xl text-primary font-bold">Minimal setup, full control when needed</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTask(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer btn-press"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Task Name</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="What needs to happen?"
                  autoFocus
                  required
                  className="w-full bg-neutral-bg border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Due Date</span>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-neutral-bg border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Priority</span>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                    className="w-full bg-neutral-bg border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Category</span>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as Task['category'])}
                    className="w-full bg-neutral-bg border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                  >
                    {CATEGORY_OPTIONS.filter((option) => option !== 'All').map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={3}
                  placeholder="Optional context, deliverables, or notes"
                  className="w-full resize-none bg-neutral-bg border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                />
              </div>

              <div className="border border-border bg-neutral-bg/40">
                <button
                  type="button"
                  onClick={() => setShowAdvancedAddTask((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 font-label text-xs uppercase tracking-[0.16em] text-primary font-bold cursor-pointer btn-press"
                >
                  <span>Advanced Options</span>
                  <span>{showAdvancedAddTask ? 'Hide' : 'Show'}</span>
                </button>

                {showAdvancedAddTask && (
                  <div className="p-4 border-t border-border space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-2">
                        <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Project</span>
                        <select
                          value={newTaskProjId}
                          onChange={(e) => {
                            setNewTaskProjId(e.target.value);
                            setNewTaskParentId('');
                            setNewTaskDepIds([]);
                          }}
                          className="w-full bg-background border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                        >
                          <option value="">Standalone task</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Recurring</span>
                        <select
                          value={newTaskRecurring}
                          onChange={(e) => setNewTaskRecurring(e.target.value as Task['recurring'])}
                          className="w-full bg-background border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                        >
                          {RECURRING_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option === 'none' ? 'One time' : option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-2">
                        <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Parent Task</span>
                        <select
                          value={newTaskParentId}
                          onChange={(e) => setNewTaskParentId(e.target.value)}
                          className="w-full bg-background border border-border px-3 py-3 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                        >
                          <option value="">None</option>
                          {tasks
                            .filter((task) => task.project_id === (newTaskProjId || undefined) && !task.parent_task_id && task.status !== 'done')
                            .map((task) => (
                              <option key={task.id} value={task.id}>{task.name}</option>
                            ))}
                        </select>
                      </label>

                      <div className="space-y-2">
                        <span className="block text-[10px] uppercase text-secondary font-bold tracking-[0.16em]">Blocked By</span>
                        <div className="min-h-[52px] border border-border bg-background p-2 flex flex-wrap gap-2">
                          {tasks
                            .filter((task) => task.project_id === (newTaskProjId || undefined) && task.status !== 'done')
                            .map((task) => {
                              const isSelected = newTaskDepIds.includes(task.id);
                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  onClick={() => {
                                    setNewTaskDepIds((prev) => (
                                      prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                                    ));
                                  }}
                                  className={`px-2 py-1 text-[10px] uppercase font-bold tracking-[0.14em] border cursor-pointer btn-press ${
                                    isSelected ? 'bg-primary text-on-primary border-primary' : 'text-primary border-border hover:border-primary'
                                  }`}
                                >
                                  {task.name}
                                </button>
                              );
                            })}
                          {tasks.filter((task) => task.project_id === (newTaskProjId || undefined) && task.status !== 'done').length === 0 && (
                            <span className="text-xs text-secondary italic font-sans">No active tasks in this project.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <PrimaryButton type="submit" disabled={!newTaskName.trim()} className="flex-1">
                  Create Task
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setShowAddTask(false)} className="px-5">
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'kanban' && (
        <div className="space-y-5">
          <section className="hidden xl:grid xl:grid-cols-4 gap-3">
            {kanbanColumns.map((column) => (
              <button
                key={column.status}
                type="button"
                onClick={() => setActiveKanbanColumn(column.status)}
                className={`text-left border p-4 transition-all btn-press ${column.surface} ${
                  activeKanbanColumn === column.status ? 'ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-label text-[10px] uppercase tracking-[0.16em] font-bold ${column.accent}`}>
                    {column.name}
                  </span>
                  <span className="font-display text-2xl text-primary font-bold">{statusCounts[column.status] || 0}</span>
                </div>
                <p className="mt-2 text-xs text-secondary font-sans">
                  {column.status === 'backlog' && 'Ideas and tasks not yet pulled into execution.'}
                  {column.status === 'todo' && 'Tasks queued to start, including blocked work that still needs resolution.'}
                  {column.status === 'in_progress' && 'Tasks actively being executed right now.'}
                  {column.status === 'done' && 'Recently completed work and shipped outcomes.'}
                </p>
              </button>
            ))}
          </section>

          <div className="flex md:hidden border border-border font-label text-xs uppercase tracking-wider overflow-x-auto bg-surface">
            {kanbanColumns.map((column) => (
              <button
                key={column.status}
                type="button"
                onClick={() => setActiveKanbanColumn(column.status)}
                className={`flex-1 min-w-[88px] py-3 text-center border-r border-border last:border-r-0 font-bold transition-all btn-press ${
                  activeKanbanColumn === column.status ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/50'
                }`}
              >
                {column.shortName} ({statusCounts[column.status] || 0})
              </button>
            ))}
          </div>

          <div className="flex flex-col xl:grid xl:grid-cols-4 gap-5 pb-4">
            {kanbanColumns.map((column) => {
              let columnTasks = filteredTasks.filter((task) => (
                !task.parent_task_id &&
                (task.status === column.status || (column.status === 'todo' && task.status === 'blocked'))
              ));
              if (column.status === 'done') {
                const oneDayAgo = currentDate.getTime() - 24 * 60 * 60 * 1000;
                columnTasks = columnTasks.filter((task) => !task.completed_at || new Date(task.completed_at).getTime() > oneDayAgo);
              }

              columnTasks = columnTasks.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                if (getPriorityWeight(a.priority) !== getPriorityWeight(b.priority)) {
                  return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                }
                return a.name.localeCompare(b.name);
              });

              const isVisibleOnMobile = column.status === activeKanbanColumn;
              const isDraggedOver = column.status === draggedOverColumn;

              return (
                <section
                  key={column.status}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, column.status)}
                  onDragLeave={(e) => handleDragLeave(e, column.status)}
                  onDrop={(e) => handleDrop(e, column.status)}
                  className={`border p-4 flex flex-col min-h-[420px] xl:min-h-[540px] transition-all ${
                    isVisibleOnMobile ? 'flex' : 'hidden md:hidden xl:flex'
                  } ${isDraggedOver ? 'border-dashed border-primary bg-primary/5' : 'border-border bg-surface'}`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <div className={`font-label text-[10px] uppercase tracking-[0.18em] font-bold ${column.accent}`}>
                        {column.name}
                      </div>
                      <div className="font-display text-2xl text-primary font-bold">
                        {statusCounts[column.status] || 0}
                      </div>
                    </div>
                    {column.status === 'done' ? (
                      <button
                        onClick={() => setShowDoneModal(true)}
                        className="text-[10px] border border-border px-2.5 py-1 hover:border-primary transition-colors cursor-pointer bg-neutral-bg font-bold tracking-[0.16em] text-secondary btn-press"
                      >
                        OPEN LOG
                      </button>
                    ) : (
                      <Grip className="h-4 w-4 text-secondary" />
                    )}
                  </div>

                  <div className="flex-1 mt-4 space-y-3">
                    {columnTasks.map((task) => {
                      const isBlocked = isTaskBlocked(task);
                      const subtasks = filteredTasks.filter((subtask) => subtask.parent_task_id === task.id);
                      const parentProject = projects.find((project) => project.id === task.project_id);
                      const dueDate = normalizeDueDateForInput(task.due_date);
                      const isDone = task.status === 'done';

                      return (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openTaskModal(task)}
                          className={`border p-3.5 cursor-pointer transition-all group overflow-hidden ${
                            isDone ? 'opacity-70 bg-neutral-bg/40 border-border' : 'bg-background border-border hover:border-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className="font-label text-[10px] text-white px-1.5 py-0.5 uppercase tracking-[0.14em] font-bold"
                                  style={{ backgroundColor: parentProject?.color || '#6C7278' }}
                                >
                                  {parentProject ? parentProject.name : 'Standalone'}
                                </span>
                                {task.category && <StatusBadge status={task.category} type="category" />}
                              </div>

                              <div className="flex items-start gap-2">
                                {!isDone && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartFocusSession(task.id);
                                    }}
                                    className="text-secondary hover:text-accent cursor-pointer btn-press mt-0.5"
                                    title="Start Focus Session"
                                  >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                  </button>
                                )}
                                <div className="min-w-0">
                                  <h3 className={`font-sans text-sm font-semibold leading-snug ${isDone ? 'line-through text-secondary' : 'text-primary'}`}>
                                    {task.name}
                                  </h3>
                                  {task.description && (
                                    <p className="mt-1 text-xs text-secondary font-sans line-clamp-3 leading-relaxed">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinTask(task.id);
                                showToast(`Task ${task.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                              }}
                              className={`cursor-pointer btn-press ${task.is_pinned ? 'text-accent' : 'text-stone-300 opacity-0 group-hover:opacity-100'}`}
                            >
                              <Pin className="h-3.5 w-3.5 fill-current" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 font-label text-[10px] uppercase tracking-[0.14em] font-bold">
                            <StatusBadge status={task.priority} type="priority" />
                            {dueDate && (
                              <span className={getDateTone(dueDate, todayStr)}>
                                Due {new Date(task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {task.recurring !== 'none' && (
                              <span className="text-secondary">Recurring {task.recurring}</span>
                            )}
                          </div>

                          {task.inbox_item_id && inboxItems.some((item) => item.id === task.inbox_item_id) && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/inbox?itemId=${task.inbox_item_id}`);
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.16em] text-secondary hover:text-accent transition-colors cursor-pointer border border-border px-2 py-1 bg-neutral-bg/55 btn-press"
                            >
                              <Inbox className="h-3 w-3 shrink-0" />
                              <span>Inbox Origin</span>
                            </div>
                          )}

                          {(isBlocked || subtasks.length > 0) && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              {isBlocked && (
                                <div className="flex items-center gap-1.5 text-danger">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span className="font-label text-[10px] uppercase tracking-[0.16em] font-bold">
                                    Dependency unresolved
                                  </span>
                                </div>
                              )}

                              {subtasks.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-label text-[10px] uppercase tracking-[0.16em] font-bold text-secondary">
                                      Subtasks
                                    </span>
                                    <span className="font-label text-[10px] text-secondary uppercase font-bold">
                                      {subtasks.filter((item) => item.status === 'done').length}/{subtasks.length}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {subtasks.map((subtask) => (
                                      <label key={subtask.id} className="flex items-center justify-between gap-3 border border-border bg-neutral-bg/35 px-2 py-1.5">
                                        <span className={`text-[11px] font-sans ${subtask.status === 'done' ? 'line-through text-secondary' : 'text-primary'}`}>
                                          {subtask.name}
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={subtask.status === 'done'}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleUpdateTaskStatusWithUndo(subtask.id, subtask.status === 'done' ? 'todo' : 'done');
                                          }}
                                          className="h-3.5 w-3.5 accent-accent cursor-pointer"
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-primary font-sans">
                              <Timer className="h-3.5 w-3.5 text-secondary" />
                              <span>{task.pomodoro_sessions || 0} sessions</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <select
                                value={task.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatusWithUndo(task.id, e.target.value as Task['status']);
                                }}
                                className="md:hidden min-w-0 flex-1 bg-neutral-bg border border-border px-2 py-1 text-[10px] text-primary focus:outline-none font-sans"
                              >
                                {STATUS_META.map((option) => (
                                  <option key={option.status} value={option.status}>{option.name}</option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteTask(task.id, task.name);
                                }}
                                className="shrink-0 border border-border bg-neutral-bg text-stone-400 hover:text-accent hover:border-primary transition-colors cursor-pointer p-1.5 btn-press"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="border border-dashed border-border bg-neutral-bg/30 p-4 text-center">
                        <p className="text-sm text-primary font-semibold">
                          {column.status === 'done' ? 'No recent completions here.' : `No tasks in ${column.name.toLowerCase()}.`}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          {column.status === 'todo' ? 'Drag a task here when it is ready to start or waiting on a dependency.' : 'Use the board to pull work forward deliberately.'}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_380px] gap-6">
          <section className="bg-surface border border-border p-4 md:p-6 space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Schedule Planner</div>
                <h3 className="font-display text-2xl text-primary font-bold">{formatMonthHeading(currentDate)}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedCalendarDate(getLocalDateString(today));
                  }}
                  className="px-3 py-2 border border-border bg-neutral-bg text-primary hover:border-primary text-xs uppercase font-bold tracking-[0.16em] btn-press"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-2 border border-border bg-neutral-bg text-primary hover:border-primary btn-press"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="p-2 border border-border bg-neutral-bg text-primary hover:border-primary btn-press"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-4 gap-3">
              <div className="border border-border bg-neutral-bg/35 p-3">
                <div className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Scheduled</div>
                <div className="font-display text-2xl text-primary font-bold mt-1">
                  {openTasks.filter((task) => task.due_date).length}
                </div>
              </div>
              <div className="border border-border bg-neutral-bg/35 p-3">
                <div className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Unscheduled</div>
                <div className="font-display text-2xl text-primary font-bold mt-1">{unscheduledTasks.length}</div>
              </div>
              <div className="border border-border bg-neutral-bg/35 p-3">
                <div className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Recurring</div>
                <div className="font-display text-2xl text-primary font-bold mt-1">
                  {openTasks.filter((task) => task.recurring !== 'none').length}
                </div>
              </div>
              <div className="border border-border bg-neutral-bg/35 p-3">
                <div className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Selected Day</div>
                <div className="font-display text-2xl text-primary font-bold mt-1">{selectedDayTasks.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-label text-[11px] text-secondary uppercase tracking-[0.16em] font-bold select-none">
              {WEEKDAY_LABELS.map((day) => <div key={day}>{day}</div>)}
            </div>

            <div className="hidden md:grid grid-cols-7 gap-1">
              {monthCells.map((cell) => {
                if (!cell.dateStr || !cell.day) {
                  return <div key={cell.key} className="min-h-[110px] border border-transparent bg-neutral-bg/20" />;
                }

                const dayTasks = filteredTasks.filter((task) => (
                  task.due_date && getLocalDateString(new Date(task.due_date)) === cell.dateStr
                ));
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedCalendarDate;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr!)}
                    className={`min-h-[110px] border p-2 text-left transition-all btn-press ${
                      isSelected ? 'border-primary bg-primary/8' : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-label text-xs font-bold ${isToday ? 'text-accent' : 'text-primary'}`}>
                        {cell.day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-accent">Today</span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTaskModal(task);
                          }}
                          className={`px-2 py-1 text-[10px] font-sans truncate border ${
                            task.status === 'done'
                              ? 'border-border bg-neutral-bg/35 text-secondary line-through'
                              : 'border-primary/15 bg-primary/5 text-primary'
                          }`}
                          title={task.name}
                        >
                          {task.name}
                        </div>
                      ))}
                    </div>

                    {dayTasks.length > 3 && (
                      <div className="mt-2 text-[10px] font-label uppercase tracking-[0.14em] font-bold text-secondary">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid md:hidden grid-cols-7 gap-1">
              {monthCells.map((cell) => {
                if (!cell.dateStr || !cell.day) {
                  return <div key={cell.key} className="h-10" />;
                }

                const hasTasks = filteredTasks.some((task) => (
                  task.due_date && getLocalDateString(new Date(task.due_date)) === cell.dateStr
                ));
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedCalendarDate;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.dateStr!)}
                    className={`h-11 w-full flex flex-col items-center justify-center relative border font-label text-xs font-bold transition-all cursor-pointer btn-press ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-background border-border text-primary hover:bg-neutral-bg'
                    }`}
                  >
                    <span className={isToday && !isSelected ? 'text-accent' : ''}>{cell.day}</span>
                    {hasTasks && (
                      <span className={`h-1.5 w-1.5 absolute bottom-1.5 ${isSelected ? 'bg-surface' : 'bg-accent'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="md:hidden border border-border bg-neutral-bg/35 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Day Agenda</div>
                  <div className="font-sans text-sm font-semibold text-primary mt-1">{formatLongDate(selectedCalendarDate)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateTaskModal(selectedCalendarDate)}
                  className="border border-border bg-background px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-bold text-primary btn-press"
                >
                  New Task
                </button>
              </div>

              <div className="space-y-2.5">
                {selectedDayTasks.length > 0 ? selectedDayTasks.map((task) => {
                  const parentProject = projects.find((project) => project.id === task.project_id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => openTaskModal(task)}
                      className="flex items-center justify-between gap-3 border border-border bg-background p-3 cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="min-w-0">
                        <div className={`font-sans text-sm font-semibold truncate ${task.status === 'done' ? 'line-through text-secondary' : 'text-primary'}`}>
                          {task.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={task.priority} type="priority" />
                          {task.category && <StatusBadge status={task.category} type="category" />}
                          <span className="font-label text-[10px] uppercase tracking-[0.14em] text-secondary font-bold">
                            {parentProject ? parentProject.name : 'Standalone'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="h-4 w-4 accent-accent cursor-pointer shrink-0"
                      />
                    </div>
                  );
                }) : (
                  <div className="border border-dashed border-border bg-neutral-bg/30 p-4 text-center">
                    <p className="text-sm text-primary font-semibold">No tasks scheduled for this day.</p>
                    <p className="text-xs text-secondary mt-1">Tap a date dot or create a task directly here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="hidden xl:block bg-surface border border-border p-4 md:p-5 space-y-5">
            <div className="border-b border-border pb-4">
              <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Selected Day</div>
              <h3 className="font-display text-2xl text-primary font-bold mt-1">{formatLongDate(selectedCalendarDate)}</h3>
              <p className="text-xs text-secondary font-sans mt-2">
                Use this panel to review the agenda, create work directly on the date, and drag unscheduled items into the plan deliberately.
              </p>
              <div className="flex gap-2 mt-4">
                <PrimaryButton onClick={() => openCreateTaskModal(selectedCalendarDate)} className="flex-1">
                  <Plus className="h-4 w-4" />
                  <span>Task On This Day</span>
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => setSelectedCalendarDate(todayStr)}
                  className="px-4"
                >
                  Today
                </SecondaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Agenda</span>
                <span className="font-label text-xs text-primary uppercase font-bold">{selectedDayTasks.length} items</span>
              </div>

              {selectedDayTasks.length > 0 ? selectedDayTasks.map((task) => {
                const parentProject = projects.find((project) => project.id === task.project_id);
                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskModal(task)}
                    className="border border-border bg-background p-3 cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className={`font-sans text-sm font-semibold ${task.status === 'done' ? 'line-through text-secondary' : 'text-primary'}`}>
                          {task.name}
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-2 items-center">
                          <StatusBadge status={task.priority} type="priority" />
                          {task.category && <StatusBadge status={task.category} type="category" />}
                          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-secondary">
                            {parentProject ? parentProject.name : 'Standalone'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="h-4 w-4 accent-accent cursor-pointer"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {task.status !== 'done' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartFocusSession(task.id);
                            }}
                            className="text-secondary hover:text-accent cursor-pointer btn-press"
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinTask(task.id);
                            showToast(`Task ${task.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                          }}
                          className={`${task.is_pinned ? 'text-accent' : 'text-secondary'} cursor-pointer btn-press`}
                        >
                          <Pin className="h-4 w-4 fill-current" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scheduleTaskDate(task.id);
                        }}
                        className="text-[10px] uppercase tracking-[0.16em] font-bold text-secondary hover:text-primary cursor-pointer btn-press"
                      >
                        Clear Date
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="border border-dashed border-border bg-neutral-bg/30 p-4 text-center">
                  <p className="text-sm text-primary font-semibold">No tasks scheduled for this day.</p>
                  <p className="text-xs text-secondary mt-1">Create one directly here or pull an unscheduled task into the date.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Unscheduled</span>
                <span className="font-label text-xs text-primary uppercase font-bold">{unscheduledTasks.length}</span>
              </div>

              {unscheduledTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-sans text-sm font-semibold text-primary truncate">{task.name}</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={task.priority} type="priority" />
                        {task.category && <StatusBadge status={task.category} type="category" />}
                      </div>
                    </div>
                    <CircleDot className="h-4 w-4 text-secondary shrink-0" />
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => scheduleTaskDate(task.id, selectedCalendarDate)}
                      className="flex-1 border border-border px-2 py-2 text-[10px] uppercase tracking-[0.16em] font-bold text-primary hover:border-primary btn-press"
                    >
                      Place Here
                    </button>
                    <button
                      type="button"
                      onClick={() => scheduleTaskDate(task.id, todayStr)}
                      className="flex-1 border border-border px-2 py-2 text-[10px] uppercase tracking-[0.16em] font-bold text-primary hover:border-primary btn-press"
                    >
                      Today
                    </button>
                  </div>
                </div>
              ))}

              {unscheduledTasks.length === 0 && (
                <div className="border border-dashed border-border bg-neutral-bg/30 p-4 text-center text-xs text-secondary">
                  Every open task in the current filter already has a date.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Upcoming</span>
                <span className="font-label text-xs text-primary uppercase font-bold">{upcomingTasks.length}</span>
              </div>

              {upcomingTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    const date = getLocalDateString(new Date(task.due_date!));
                    setSelectedCalendarDate(date);
                    const due = new Date(task.due_date!);
                    setCurrentDate(new Date(due.getFullYear(), due.getMonth(), 1));
                  }}
                  className="w-full text-left border border-border bg-background p-3 hover:border-primary transition-colors btn-press"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-semibold text-primary truncate">{task.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-secondary mt-1">
                        {new Date(task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <StatusBadge status={task.priority} type="priority" />
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <aside className="bg-surface border border-border p-5 space-y-5">
            <div>
              <span className="font-label text-[10px] text-secondary uppercase tracking-[0.18em] font-bold">Focus Plan</span>
              <h3 className="font-display text-2xl text-primary font-bold mt-1">
                {sortedTodayTasks.length} item{sortedTodayTasks.length === 1 ? '' : 's'} in play
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 font-label text-[10px] uppercase tracking-wider">
              <div className="border border-border bg-neutral-bg p-3">
                <span className="text-secondary block">Due</span>
                <span className="font-display text-2xl text-primary font-bold">{dueTodayTasks.length}</span>
              </div>
              <div className="border border-border bg-neutral-bg p-3">
                <span className="text-secondary block">Late</span>
                <span className="font-display text-2xl text-danger font-bold">{overdueTasks.length}</span>
              </div>
              <div className="border border-border bg-neutral-bg p-3">
                <span className="text-secondary block">Pinned</span>
                <span className="font-display text-2xl text-accent font-bold">{pinnedTasks.length}</span>
              </div>
              <div className="border border-border bg-neutral-bg p-3">
                <span className="text-secondary block">Blocked</span>
                <span className="font-display text-2xl text-warning font-bold">{blockedTasks.length}</span>
              </div>
            </div>
            <PrimaryButton
              onClick={() => openCreateTaskModal(todayStr)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Focus Task
            </PrimaryButton>
          </aside>

          <div className="bg-surface border border-border p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block font-bold">
                  Today Execution List
                </span>
                <p className="font-sans text-xs text-secondary mt-1">
                  Pinned, overdue, and due-today tasks are sorted by priority.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('kanban')}
                className="font-label text-xs uppercase tracking-wider text-accent font-bold hover:underline text-left sm:text-right"
              >
                Open board
              </button>
            </div>

            <div className="space-y-3">
              {sortedTodayTasks.length > 0 ? sortedTodayTasks.map((task) => {
                const parentProject = projects.find((project) => project.id === task.project_id);
                const isDone = task.status === 'done';
                const dueDate = task.due_date ? getLocalDateString(new Date(task.due_date)) : '';
                const isLate = Boolean(dueDate && dueDate < todayStr);

                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskModal(task)}
                    className={`group flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-neutral-bg border hover:border-primary cursor-pointer transition-all ${
                      isDone ? 'opacity-65 border-border bg-neutral-bg/30' : ''
                    } ${isLate ? 'border-danger/50' : 'border-border'}`}
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateTaskStatusWithUndo(task.id, task.status === 'done' ? 'todo' : 'done');
                        }}
                        className="h-4.5 w-4.5 accent-accent shrink-0 cursor-pointer"
                      />
                      {task.status !== 'done' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartFocusSession(task.id);
                          }}
                          className="text-secondary hover:text-accent cursor-pointer btn-press"
                          title="Start Focus Session"
                        >
                          <Play className="h-4.5 w-4.5 fill-current" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <span className={`font-sans text-sm font-semibold text-primary block ${isDone ? 'line-through text-secondary' : ''}`}>
                          {task.name}
                        </span>
                        {task.description && (
                          <p className="font-sans text-xs text-secondary mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 font-label text-xs">
                          <StatusBadge status={task.priority} type="priority" />
                          <span className="text-secondary uppercase font-semibold">
                            {parentProject ? parentProject.name : 'STANDALONE'}
                          </span>
                          {task.category && <StatusBadge status={task.category} type="category" />}
                          {task.recurring !== 'none' && (
                            <span className="text-secondary font-bold">Recurring: {task.recurring.toUpperCase()}</span>
                          )}
                          {task.due_date && (
                            <span className={`font-bold ${isLate ? 'text-danger' : 'text-secondary'}`}>
                              DUE {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTask(task.id);
                          showToast(`Task ${task.is_pinned ? 'unpinned' : 'pinned to focus'}.`, 'info');
                        }}
                        className={`text-xs cursor-pointer p-1 btn-press ${task.is_pinned ? 'text-accent' : 'text-stone-300 hover:text-secondary'}`}
                      >
                        <Pin className="h-4.5 w-4.5 fill-current" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerDeleteTask(task.id, task.name);
                        }}
                        className="text-stone-300 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 btn-press"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="font-sans text-center py-12 border border-dashed border-border bg-neutral-bg/35">
                  <p className="text-sm text-primary font-semibold">No focus tasks active for today.</p>
                  <p className="text-xs text-secondary mt-1">Pin a task, assign a due date, or create a new focus task.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TaskDetailsModal
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

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
            if (selectedTaskId === taskToDelete.id) setSelectedTaskId(null);
          }
        }}
        itemName={taskToDelete?.name || ''}
        itemType="task"
      />

      {showDoneModal && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h2 className="font-display text-2xl font-bold text-primary uppercase tracking-tight">Done Log History</h2>
              <button
                onClick={() => setShowDoneModal(false)}
                className="text-secondary hover:text-accent transition-colors cursor-pointer btn-press"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 shrink-0 bg-neutral-bg/50">
              <div className="flex-1">
                <label className="font-label text-xs uppercase tracking-wider text-secondary block mb-1.5 font-bold">Category</label>
                <select
                  value={doneFilterCategory}
                  onChange={(e) => setDoneFilterCategory(e.target.value as typeof doneFilterCategory)}
                  className="w-full bg-surface border border-border text-primary text-sm p-2 focus:border-accent outline-none font-sans"
                >
                  <option value="All">All Categories</option>
                  {CATEGORY_OPTIONS.filter((option) => option !== 'All').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="font-label text-xs uppercase tracking-wider text-secondary block mb-1.5 font-bold">Sort By</label>
                <select
                  value={doneSortBy}
                  onChange={(e) => setDoneSortBy(e.target.value as typeof doneSortBy)}
                  className="w-full bg-surface border border-border text-primary text-sm p-2 focus:border-accent outline-none font-sans"
                >
                  <option value="date_desc">Completion Date (Newest)</option>
                  <option value="date_asc">Completion Date (Oldest)</option>
                  <option value="priority">Priority</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredTasks
                .filter((task) => task.status === 'done' && (doneFilterCategory === 'All' || task.category === doneFilterCategory))
                .sort((a, b) => {
                  if (doneSortBy === 'priority') {
                    if (getPriorityWeight(a.priority) !== getPriorityWeight(b.priority)) {
                      return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                    }
                    return a.name.localeCompare(b.name);
                  }
                  if (doneSortBy === 'name') return a.name.localeCompare(b.name);
                  const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
                  const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
                  return doneSortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
                })
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-neutral-bg border border-border p-4 flex justify-between items-center group hover:border-primary transition-colors cursor-pointer"
                    onClick={() => {
                      setShowDoneModal(false);
                      openTaskModal(task);
                    }}
                  >
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-sans text-sm font-semibold text-primary/80 line-through truncate">{task.name}</span>
                      <div className="flex items-center gap-2 mt-1 font-sans text-[11px] text-secondary">
                        <span className="font-bold">{task.priority.toUpperCase()}</span>
                        <span>•</span>
                        <span>{task.category || 'No Category'}</span>
                        {task.completed_at && (
                          <>
                            <span>•</span>
                            <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {filteredTasks.filter((task) => task.status === 'done' && (doneFilterCategory === 'All' || task.category === doneFilterCategory)).length === 0 && (
                <p className="text-secondary text-sm italic text-center py-8">No completed tasks match your filters.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={(
        <div className="bg-surface border border-secondary/30 py-16 text-center rounded-sm">
          <p className="font-sans text-sm text-secondary italic">Loading Tasks Workspace...</p>
        </div>
      )}
    >
      <TasksContent />
    </Suspense>
  );
}
