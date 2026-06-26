'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';

export interface Project {
  id: string;
  area: 'Business' | 'Health' | 'Personal' | 'Finance' | 'Other';
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  client?: string;
  gain?: string;
  deadline?: string;
  start_date?: string;
  is_archived?: boolean;
  status?: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface Task {
  id: string;
  project_id?: string;
  name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';
  due_date?: string;
  is_pinned: boolean;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';
  parent_task_id?: string;
  dependencies: string[]; // blocking task IDs
  pomodoro_sessions: number;
  created_at?: string;
  category?: 'Work' | 'Personal' | 'Urgent' | 'Learning' | 'Other';
}

interface TaskProjectContextProps {
  projects: Project[];
  tasks: Task[];
  loading: boolean;
  addProject: (
    area: Project['area'],
    name: string,
    description?: string,
    color?: string,
    client?: string,
    gain?: string,
    deadline?: string,
    status?: Project['status'],
    start_date?: string
  ) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string, isArchived: boolean) => Promise<void>;
  addTask: (
    projectId: string | undefined,
    name: string,
    description?: string,
    priority?: Task['priority'],
    dueDate?: string,
    recurring?: Task['recurring'],
    parentTaskId?: string,
    dependencies?: string[],
    category?: Task['category']
  ) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTaskPomodoro: (taskId: string, count: number) => Promise<void>;
  togglePinTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

const TaskProjectContext = createContext<TaskProjectContextProps | undefined>(undefined);

export const useTaskProject = () => {
  const context = useContext(TaskProjectContext);
  if (!context) {
    throw new Error('useTaskProject must be used within a TaskProjectProvider');
  }
  return context;
};

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', area: 'Business', name: 'Launch Heritage Platform', description: 'Architectural dashboard for personal management.', color: '#B8422E', client: 'Internal / Self', gain: 'High efficiency life engine', deadline: new Date(Date.now() + 86400000 * 30).toISOString(), status: 'active' },
  { id: 'p2', area: 'Health', name: 'Marathon 2026 Training', description: 'Sub-4 hour marathon preparation program.', color: '#6C7278', client: 'Self', gain: 'Excellent cardiovascular health', deadline: new Date(Date.now() + 86400000 * 120).toISOString(), status: 'active' },
  { id: 'p3', area: 'Personal', name: 'Build Heritage Library', description: 'Read 24 books focusing on history & architecture.', color: '#1A1C1E', client: 'Acme Reading Club', gain: '24 books depth & knowledge', deadline: new Date(Date.now() + 86400000 * 200).toISOString(), status: 'active' }
];

const MOCK_TASKS: Task[] = [
  { id: 't1', project_id: 'p1', name: 'Draft brand guidelines & palette', description: 'Define limestone light theme and Terracotta accent usage.', priority: 'high', status: 'done', due_date: new Date().toISOString(), is_pinned: true, recurring: 'none', dependencies: [], pomodoro_sessions: 2, category: 'Work' },
  { id: 't2', project_id: 'p1', name: 'Initialize Next.js and PWA config', description: 'Implement manifest.json and sw.js offline service worker.', priority: 'high', status: 'done', due_date: new Date().toISOString(), is_pinned: false, recurring: 'none', dependencies: [], pomodoro_sessions: 3, category: 'Work' },
  { id: 't3', project_id: 'p1', name: 'Supabase schema migrations', description: 'Execute table creation SQL script for database entity sync.', priority: 'high', status: 'in_progress', due_date: new Date().toISOString(), is_pinned: true, recurring: 'none', dependencies: ['t2'], pomodoro_sessions: 1, category: 'Work' },
  { id: 't4', project_id: 'p1', name: 'PWA audit and lighthouse testing', description: 'Check mobile display performance and service worker caching.', priority: 'medium', status: 'todo', due_date: new Date(Date.now() + 86400000 * 2).toISOString(), is_pinned: false, recurring: 'none', dependencies: ['t3'], pomodoro_sessions: 0, category: 'Work' },
  { id: 't5', project_id: 'p2', name: 'Purchase custom running shoes', description: 'Visit local shop for gate analysis and selection.', priority: 'medium', status: 'done', due_date: new Date(Date.now() - 86400000 * 3).toISOString(), is_pinned: false, recurring: 'none', dependencies: [], pomodoro_sessions: 1, category: 'Personal' },
  { id: 't6', project_id: 'p2', name: 'Interval Session: 5x1000m', description: 'Pace targets at 4:15 min/km with 2 min walking recoveries.', priority: 'high', status: 'todo', due_date: new Date().toISOString(), is_pinned: true, recurring: 'weekly', dependencies: [], pomodoro_sessions: 0, category: 'Personal' },
  { id: 't7', project_id: 'p2', name: 'Long Sunday Run: 18km', description: 'Aerobic threshold run, maintain pace around 5:15 min/km.', priority: 'medium', status: 'todo', due_date: new Date(Date.now() + 86400000 * 3).toISOString(), is_pinned: false, recurring: 'weekly', dependencies: [], pomodoro_sessions: 0, category: 'Personal' },
  { id: 't8', project_id: 'p3', name: 'Read \"The Fountainhead\"', description: 'Focus on individualist architecture chapters.', priority: 'low', status: 'in_progress', due_date: new Date(Date.now() + 86400000 * 7).toISOString(), is_pinned: false, recurring: 'none', dependencies: [], pomodoro_sessions: 4, category: 'Learning' }
];

export const TaskProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resProjects, resTasks] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*')
        ]);

        const hasProjData = resProjects.data && resProjects.data.length > 0;
        const hasTaskData = resTasks.data && resTasks.data.length > 0;

        if (hasProjData || hasTaskData) {
          setProjects(resProjects.data || []);
          setTasks(resTasks.data || []);
          localStorage.setItem('heritage_projects', JSON.stringify(resProjects.data || []));
          localStorage.setItem('heritage_tasks', JSON.stringify(resTasks.data || []));
        } else {
          const localProjects = localStorage.getItem('heritage_projects');
          const localTasks = localStorage.getItem('heritage_tasks');

          setProjects(localProjects ? JSON.parse(localProjects) : MOCK_PROJECTS);
          setTasks(localTasks ? JSON.parse(localTasks) : MOCK_TASKS);

          if (!localProjects && isOnline) {
            await Promise.all([
              supabase.from('projects').upsert(MOCK_PROJECTS),
              supabase.from('tasks').upsert(MOCK_TASKS)
            ]);
          }
        }
      } catch (err) {
        console.warn('Recovering tasks & projects from cache:', err);
        const localProjects = localStorage.getItem('heritage_projects');
        const localTasks = localStorage.getItem('heritage_tasks');

        setProjects(localProjects ? JSON.parse(localProjects) : MOCK_PROJECTS);
        setTasks(localTasks ? JSON.parse(localTasks) : MOCK_TASKS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, refreshKey]);

  const addProject = async (
    area: Project['area'],
    name: string,
    description?: string,
    color: string = '#B8422E',
    client?: string,
    gain?: string,
    deadline?: string,
    status: Project['status'] = 'active',
    start_date?: string
  ) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      area,
      name,
      description,
      color,
      client,
      gain,
      deadline,
      status,
      start_date,
      is_archived: false,
      created_at: new Date().toISOString()
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    localStorage.setItem('heritage_projects', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('projects').insert(newProject);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, ...updates };
      }
      return p;
    });

    setProjects(updated);
    localStorage.setItem('heritage_projects', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('projects').update(updates).eq('id', projectId);
    }
  };

  const deleteProject = async (id: string) => {
    const updatedProj = projects.filter((p) => p.id !== id);
    const updatedTasks = tasks.filter((t) => t.project_id !== id);

    setProjects(updatedProj);
    setTasks(updatedTasks);
    localStorage.setItem('heritage_projects', JSON.stringify(updatedProj));
    localStorage.setItem('heritage_tasks', JSON.stringify(updatedTasks));

    if (isOnline) {
      await supabase.from('projects').delete().eq('id', id);
    }
  };

  const archiveProject = async (id: string, isArchived: boolean) => {
    const updated = projects.map((p) => {
      if (p.id === id) {
        return { ...p, is_archived: isArchived };
      }
      return p;
    });

    setProjects(updated);
    localStorage.setItem('heritage_projects', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('projects').update({ is_archived: isArchived }).eq('id', id);
    }
  };

  const addTask = async (
    projectId: string | undefined,
    name: string,
    description?: string,
    priority: Task['priority'] = 'medium',
    dueDate?: string,
    recurring: Task['recurring'] = 'none',
    parentTaskId?: string,
    dependencies: string[] = [],
    category?: Task['category']
  ) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      project_id: projectId || undefined,
      name,
      description,
      priority,
      status: 'todo',
      due_date: dueDate || new Date().toISOString(),
      is_pinned: false,
      recurring,
      parent_task_id: parentTaskId,
      dependencies,
      pomodoro_sessions: 0,
      category,
      created_at: new Date().toISOString()
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('tasks').insert(newTask);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, ...updates };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('tasks').update(updates).eq('id', taskId);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    let updatedTasks = [...tasks];

    if (status === 'done' && originalTask.recurring !== 'none') {
      const baseDate = new Date(originalTask.due_date || Date.now());
      const today = new Date();
      const startForNext = baseDate < today ? today : baseDate;
      const nextDueDate = new Date(startForNext);
      if (originalTask.recurring === 'daily') nextDueDate.setDate(nextDueDate.getDate() + 1);
      else if (originalTask.recurring === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
      else if (originalTask.recurring === 'monthly') nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            due_date: nextDueDate.toISOString(),
            status: 'todo' as const
          };
        }
        return t;
      });
    } else {
      updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status };
        }
        return t;
      });
    }

    setTasks(updatedTasks);
    localStorage.setItem('heritage_tasks', JSON.stringify(updatedTasks));

    if (isOnline) {
      const updatedItem = updatedTasks.find((t) => t.id === taskId);
      if (updatedItem) {
        await supabase
          .from('tasks')
          .update({
            status: updatedItem.status,
            due_date: updatedItem.due_date
          })
          .eq('id', taskId);
      }
    }
  };

  const updateTaskPomodoro = async (taskId: string, count: number) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, pomodoro_sessions: count };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('tasks').update({ pomodoro_sessions: count }).eq('id', taskId);
    }
  };

  const togglePinTask = async (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, is_pinned: !t.is_pinned };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (isOnline) {
      const target = updated.find((t) => t.id === taskId);
      if (target) {
        await supabase.from('tasks').update({ is_pinned: target.is_pinned }).eq('id', taskId);
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (isOnline) {
      await supabase.from('tasks').delete().eq('id', taskId);
    }
  };

  return (
    <TaskProjectContext.Provider
      value={{
        projects,
        tasks,
        loading,
        addProject,
        updateProject,
        deleteProject,
        archiveProject,
        addTask,
        updateTask,
        updateTaskStatus,
        updateTaskPomodoro,
        togglePinTask,
        deleteTask
      }}
    >
      {children}
    </TaskProjectContext.Provider>
  );
};
