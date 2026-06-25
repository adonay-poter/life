'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getLocalDateString } from '@/utils/dateUtils';

export { getLocalDateString };

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface InboxItem {
  id: string;
  type: 'text' | 'url' | 'snippet';
  title: string;
  url?: string;
  content?: string;
  tags: string[];
  status: 'unsorted' | 'task' | 'academy' | 'snoozed' | 'archived' | 'knowledge';
  created_at: string;
  snoozed_until?: string;
  project_id?: string;
}

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

export interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  created_at?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  notes: string;
  created_at?: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  completed: boolean;
  link?: string;
  created_at?: string;
}

export interface Flashcard {
  id: string;
  course_id: string;
  module_id: string;
  front: string;
  back: string;
  box: number; // Leitner box 1-5
  next_review_date: string;
  created_at?: string;
}

export interface Habit {
  id: string;
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  goal: number;
  created_at?: string;
}

export interface HabitRecord {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  created_at?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  sleep_hours: number;
  water_intake: number;
  created_at?: string;
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  morning_intentions: string[]; // Length 3
  evening_reflections_learned: string[]; // Length 3
  evening_reflections_better: string[]; // Length 3
  free_text?: string;
  created_at?: string;
}

interface DashboardContextProps {
  // Loading & Sync state
  loading: boolean;
  isOnline: boolean;
  syncPending: boolean;

  // Data states
  inboxItems: InboxItem[];
  projects: Project[];
  tasks: Task[];
  courses: Course[];
  courseModules: CourseModule[];
  lessons: Lesson[];
  flashcards: Flashcard[];
  habits: Habit[];
  habitRecords: HabitRecord[];
  dailyLogs: DailyLog[];
  journalEntries: JournalEntry[];

  // Inbox operations
  addInboxItem: (type: 'text' | 'url' | 'snippet', title: string, url?: string, content?: string, tags?: string[], status?: InboxItem['status']) => Promise<void>;
  updateInboxItemStatus: (id: string, status: InboxItem['status'], projectId?: string) => Promise<void>;
  deleteInboxItem: (id: string) => Promise<void>;

  // Project & Task operations
  addProject: (
    area: Project['area'],
    name: string,
    description?: string,
    color?: string,
    client?: string,
    gain?: string,
    deadline?: string,
    status?: Project['status']
  ) => Promise<void>;
  updateProject: (
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'created_at'>>
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
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
  updateTask: (
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at'>>
  ) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTaskPomodoro: (taskId: string, count: number) => Promise<void>;
  togglePinTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Academy operations
  addCourse: (title: string, description?: string, category?: string) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addModule: (courseId: string, title: string, orderIndex: number) => Promise<void>;
  updateModuleNotes: (moduleId: string, notes: string) => Promise<void>;
  addLesson: (moduleId: string, title: string, link?: string) => Promise<void>;
  toggleLessonCompleted: (lessonId: string, completed: boolean) => Promise<void>;
  addFlashcard: (courseId: string, moduleId: string, front: string, back: string) => Promise<void>;
  reviewFlashcard: (flashcardId: string, correct: boolean) => Promise<void>;

  // Habit operations
  addHabit: (name: string, type: 'binary' | 'numeric', unit?: string, goal?: number) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  recordHabitValue: (habitId: string, date: string, value: number) => Promise<void>;
  updateDailyLog: (date: string, mood: number, sleepHours: number, waterIntake: number) => Promise<void>;

  // Journal operations
  updateJournalEntry: (
    date: string,
    morningIntentions: string[],
    eveningReflectionsLearned: string[],
    eveningReflectionsBetter: string[],
    freeText?: string
  ) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

// ==========================================
// INITIAL MOCK SEED DATA
// ==========================================

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

const MOCK_INBOX: InboxItem[] = [
  { id: 'i1', type: 'url', title: 'Hacker News', url: 'https://news.ycombinator.com', content: 'Aggregator of tech essays and startup articles.', tags: ['#read-later', '#idea'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i2', type: 'snippet', title: 'Hydration Guidelines', content: 'Ideal daily intake formula: Weight (kg) * 0.033 = Liters daily.', tags: ['#health'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i3', type: 'text', title: 'Purchase architectural journaling book', content: 'Matte cover sketchbook with grid dots for layout designs.', tags: ['#purchase'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i4', type: 'snippet', title: 'Deep Work Quote', content: '"If you don\'t produce, you won\'t thrive - no matter how skilled or talented you are." - Cal Newport', tags: ['#focus', '#quotes'], status: 'knowledge', created_at: new Date(Date.now() - 86400000).toISOString() }
];

const MOCK_COURSES: Course[] = [
  { id: 'c1', title: 'PWA Masterclass', description: 'Offline-first architectures using service workers & background sync.', category: 'Engineering' }
];

const MOCK_MODULES: CourseModule[] = [
  { id: 'm1', course_id: 'c1', title: 'Service Worker Fundamentals', order_index: 1, notes: '### Key Takeaways\n- Service Workers act as network proxies.\n- They require HTTPS unless running on localhost.\n- Lifecycle: register -> install -> activate -> fetch.' }
];

const MOCK_LESSONS: Lesson[] = [
  { id: 'l1', module_id: 'm1', title: 'The Lifecycle of a Service Worker', completed: true, link: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
  { id: 'l2', module_id: 'm1', title: 'Offline caching strategies detailed', completed: false, link: 'https://web.dev/offline-cookbook/' }
];

const MOCK_FLASHCARDS: Flashcard[] = [
  { id: 'f1', course_id: 'c1', module_id: 'm1', front: 'What is the primary security requirement for registering service workers?', back: 'HTTPS connection (except on localhost for testing).', box: 1, next_review_date: new Date().toISOString() }
];

const MOCK_HABITS: Habit[] = [
  { id: 'h1', name: 'Workout (30 mins)', type: 'binary', goal: 1 },
  { id: 'h2', name: 'Hydration (Liters)', type: 'numeric', unit: 'L', goal: 3 },
  { id: 'h3', name: 'Sleep Hours', type: 'numeric', unit: 'hrs', goal: 8 }
];

// Helper to generate past dates
const getDateString = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const MOCK_HABIT_RECORDS: HabitRecord[] = [
  { id: 'hr1', habit_id: 'h1', date: getDateString(0), value: 1 },
  { id: 'hr2', habit_id: 'h2', date: getDateString(0), value: 3 },
  { id: 'hr3', habit_id: 'h3', date: getDateString(0), value: 7.5 },
  
  { id: 'hr4', habit_id: 'h1', date: getDateString(1), value: 0 },
  { id: 'hr5', habit_id: 'h2', date: getDateString(1), value: 2.5 },
  { id: 'hr6', habit_id: 'h3', date: getDateString(1), value: 8 },

  { id: 'hr7', habit_id: 'h1', date: getDateString(2), value: 1 },
  { id: 'hr8', habit_id: 'h2', date: getDateString(2), value: 3.5 },
  { id: 'hr9', habit_id: 'h3', date: getDateString(2), value: 8.5 }
];

const MOCK_DAILY_LOGS: DailyLog[] = [
  { date: getDateString(0), mood: 4, sleep_hours: 7.5, water_intake: 3 },
  { date: getDateString(1), mood: 3, sleep_hours: 8, water_intake: 2.5 },
  { date: getDateString(2), mood: 5, sleep_hours: 8.5, water_intake: 3.5 }
];

const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    date: getDateString(0),
    morning_intentions: ['Submit all database schema scripts', 'Complete long interval running session', 'Read 2 chapters of architectural book'],
    evening_reflections_learned: ['Interval threshold runs require heavy warmups', 'PWA manifests require clean icon size mappings', 'Supabase handles public cascades correctly'],
    evening_reflections_better: ['Begin the long run earlier in the morning', 'Break down SQL operations into single table runs', 'Avoid working past 10 PM'],
    free_text: 'Had an extremely productive day. The Heritage layout is starting to feel very solid. Limestone background is pleasant on the eyes.'
  }
];

// ==========================================
// PROVIDER IMPLEMENTATION
// ==========================================

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncPending, setSyncPending] = useState(false);

  // Core entities
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Update online status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let active = true;
      requestAnimationFrame(() => {
        if (active) setIsOnline(navigator.onLine);
      });
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        active = false;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const seedSupabaseDatabase = async (
    p: Project[],
    t: Task[],
    i: InboxItem[],
    c: Course[],
    m: CourseModule[],
    l: Lesson[],
    fc: Flashcard[],
    h: Habit[],
    hr: HabitRecord[],
    dl: DailyLog[],
    j: JournalEntry[]
  ) => {
    try {
      setSyncPending(true);
      await Promise.all([
        supabase.from('projects').upsert(p),
        supabase.from('tasks').upsert(t),
        supabase.from('inbox_items').upsert(i),
        supabase.from('courses').upsert(c),
        supabase.from('course_modules').upsert(m),
        supabase.from('lessons').upsert(l),
        supabase.from('flashcards').upsert(fc),
        supabase.from('habits').upsert(h),
        supabase.from('habit_records').upsert(hr),
        supabase.from('daily_logs').upsert(dl),
        supabase.from('journal_entries').upsert(j)
      ]);
    } catch (err) {
      console.warn('Silent seeding failure:', err);
    } finally {
      setSyncPending(false);
    }
  };

  // Initialize and Sync Cache
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Step 1: Check Supabase tables
        const [
          resProjects,
          resTasks,
          resInbox,
          resCourses,
          resModules,
          resLessons,
          resFlashcards,
          resHabits,
          resHabitRecords,
          resDailyLogs,
          resJournal
        ] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('inbox_items').select('*'),
          supabase.from('courses').select('*'),
          supabase.from('course_modules').select('*'),
          supabase.from('lessons').select('*'),
          supabase.from('flashcards').select('*'),
          supabase.from('habits').select('*'),
          supabase.from('habit_records').select('*'),
          supabase.from('daily_logs').select('*'),
          supabase.from('journal_entries').select('*')
        ]);

        const hasDbData =
          (resProjects.data && resProjects.data.length > 0) ||
          (resTasks.data && resTasks.data.length > 0) ||
          (resInbox.data && resInbox.data.length > 0) ||
          (resCourses.data && resCourses.data.length > 0);

        if (hasDbData) {
          // If Supabase has data, use it
          setProjects(resProjects.data || []);
          setTasks(resTasks.data || []);
          setInboxItems(resInbox.data || []);
          setCourses(resCourses.data || []);
          setCourseModules(resModules.data || []);
          setLessons(resLessons.data || []);
          setFlashcards(resFlashcards.data || []);
          setHabits(resHabits.data || []);
          setHabitRecords(resHabitRecords.data || []);
          setDailyLogs(resDailyLogs.data || []);
          setJournalEntries(resJournal.data || []);

          // Sync back to local storage
          localStorage.setItem('heritage_projects', JSON.stringify(resProjects.data));
          localStorage.setItem('heritage_tasks', JSON.stringify(resTasks.data));
          localStorage.setItem('heritage_inbox', JSON.stringify(resInbox.data));
          localStorage.setItem('heritage_courses', JSON.stringify(resCourses.data));
          localStorage.setItem('heritage_modules', JSON.stringify(resModules.data));
          localStorage.setItem('heritage_lessons', JSON.stringify(resLessons.data));
          localStorage.setItem('heritage_flashcards', JSON.stringify(resFlashcards.data));
          localStorage.setItem('heritage_habits', JSON.stringify(resHabits.data));
          localStorage.setItem('heritage_habit_records', JSON.stringify(resHabitRecords.data));
          localStorage.setItem('heritage_daily_logs', JSON.stringify(resDailyLogs.data));
          localStorage.setItem('heritage_journal', JSON.stringify(resJournal.data));
        } else {
          // Check LocalStorage if database is empty or unreachable
          const localProjects = localStorage.getItem('heritage_projects');
          const localTasks = localStorage.getItem('heritage_tasks');
          const localInbox = localStorage.getItem('heritage_inbox');
          const localCourses = localStorage.getItem('heritage_courses');
          const localModules = localStorage.getItem('heritage_modules');
          const localLessons = localStorage.getItem('heritage_lessons');
          const localFlashcards = localStorage.getItem('heritage_flashcards');
          const localHabits = localStorage.getItem('heritage_habits');
          const localHabitRecords = localStorage.getItem('heritage_habit_records');
          const localDailyLogs = localStorage.getItem('heritage_daily_logs');
          const localJournal = localStorage.getItem('heritage_journal');

          if (localProjects || localInbox || localCourses) {
            // Restore from LocalStorage
            const parsedProjects = localProjects ? JSON.parse(localProjects) : [];
            const parsedTasks = localTasks ? JSON.parse(localTasks) : [];
            const parsedInbox = localInbox ? JSON.parse(localInbox) : [];
            const parsedCourses = localCourses ? JSON.parse(localCourses) : [];
            const parsedModules = localModules ? JSON.parse(localModules) : [];
            const parsedLessons = localLessons ? JSON.parse(localLessons) : [];
            const parsedFlashcards = localFlashcards ? JSON.parse(localFlashcards) : [];
            const parsedHabits = localHabits ? JSON.parse(localHabits) : [];
            const parsedHabitRecords = localHabitRecords ? JSON.parse(localHabitRecords) : [];
            const parsedDailyLogs = localDailyLogs ? JSON.parse(localDailyLogs) : [];
            const parsedJournal = localJournal ? JSON.parse(localJournal) : [];

            setProjects(parsedProjects);
            setTasks(parsedTasks);
            setInboxItems(parsedInbox);
            setCourses(parsedCourses);
            setCourseModules(parsedModules);
            setLessons(parsedLessons);
            setFlashcards(parsedFlashcards);
            setHabits(parsedHabits);
            setHabitRecords(parsedHabitRecords);
            setDailyLogs(parsedDailyLogs);
            setJournalEntries(parsedJournal);

            // Attempt to seed Supabase asynchronously in background since it is empty
            if (navigator.onLine) {
              await seedSupabaseDatabase(
                parsedProjects,
                parsedTasks,
                parsedInbox,
                parsedCourses,
                parsedModules,
                parsedLessons,
                parsedFlashcards,
                parsedHabits,
                parsedHabitRecords,
                parsedDailyLogs,
                parsedJournal
              );
            }
          } else {
            // Seed both with Mock Data (First time run)
            setProjects(MOCK_PROJECTS);
            setTasks(MOCK_TASKS);
            setInboxItems(MOCK_INBOX);
            setCourses(MOCK_COURSES);
            setCourseModules(MOCK_MODULES);
            setLessons(MOCK_LESSONS);
            setFlashcards(MOCK_FLASHCARDS);
            setHabits(MOCK_HABITS);
            setHabitRecords(MOCK_HABIT_RECORDS);
            setDailyLogs(MOCK_DAILY_LOGS);
            setJournalEntries(MOCK_JOURNAL_ENTRIES);

            localStorage.setItem('heritage_projects', JSON.stringify(MOCK_PROJECTS));
            localStorage.setItem('heritage_tasks', JSON.stringify(MOCK_TASKS));
            localStorage.setItem('heritage_inbox', JSON.stringify(MOCK_INBOX));
            localStorage.setItem('heritage_courses', JSON.stringify(MOCK_COURSES));
            localStorage.setItem('heritage_modules', JSON.stringify(MOCK_MODULES));
            localStorage.setItem('heritage_lessons', JSON.stringify(MOCK_LESSONS));
            localStorage.setItem('heritage_flashcards', JSON.stringify(MOCK_FLASHCARDS));
            localStorage.setItem('heritage_habits', JSON.stringify(MOCK_HABITS));
            localStorage.setItem('heritage_habit_records', JSON.stringify(MOCK_HABIT_RECORDS));
            localStorage.setItem('heritage_daily_logs', JSON.stringify(MOCK_DAILY_LOGS));
            localStorage.setItem('heritage_journal', JSON.stringify(MOCK_JOURNAL_ENTRIES));

            if (navigator.onLine) {
              await seedSupabaseDatabase(
                MOCK_PROJECTS,
                MOCK_TASKS,
                MOCK_INBOX,
                MOCK_COURSES,
                MOCK_MODULES,
                MOCK_LESSONS,
                MOCK_FLASHCARDS,
                MOCK_HABITS,
                MOCK_HABIT_RECORDS,
                MOCK_DAILY_LOGS,
                MOCK_JOURNAL_ENTRIES
              );
            }
          }
        }
      } catch (err) {
        console.error('Supabase load failed. Recovering with LocalStorage:', err);
        // Offline / Unreachable fallback
        const localProjects = localStorage.getItem('heritage_projects');
        const localTasks = localStorage.getItem('heritage_tasks');
        const localInbox = localStorage.getItem('heritage_inbox');
        const localCourses = localStorage.getItem('heritage_courses');
        const localModules = localStorage.getItem('heritage_modules');
        const localLessons = localStorage.getItem('heritage_lessons');
        const localFlashcards = localStorage.getItem('heritage_flashcards');
        const localHabits = localStorage.getItem('heritage_habits');
        const localHabitRecords = localStorage.getItem('heritage_habit_records');
        const localDailyLogs = localStorage.getItem('heritage_daily_logs');
        const localJournal = localStorage.getItem('heritage_journal');

        setProjects(localProjects ? JSON.parse(localProjects) : MOCK_PROJECTS);
        setTasks(localTasks ? JSON.parse(localTasks) : MOCK_TASKS);
        setInboxItems(localInbox ? JSON.parse(localInbox) : MOCK_INBOX);
        setCourses(localCourses ? JSON.parse(localCourses) : MOCK_COURSES);
        setCourseModules(localModules ? JSON.parse(localModules) : MOCK_MODULES);
        setLessons(localLessons ? JSON.parse(localLessons) : MOCK_LESSONS);
        setFlashcards(localFlashcards ? JSON.parse(localFlashcards) : MOCK_FLASHCARDS);
        setHabits(localHabits ? JSON.parse(localHabits) : MOCK_HABITS);
        setHabitRecords(localHabitRecords ? JSON.parse(localHabitRecords) : MOCK_HABIT_RECORDS);
        setDailyLogs(localDailyLogs ? JSON.parse(localDailyLogs) : MOCK_DAILY_LOGS);
        setJournalEntries(localJournal ? JSON.parse(localJournal) : MOCK_JOURNAL_ENTRIES);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // ==========================================
  // INBOX ACTIONS
  // ==========================================

  const addInboxItem = async (
    type: 'text' | 'url' | 'snippet',
    title: string,
    url?: string,
    content?: string,
    tags: string[] = [],
    status: InboxItem['status'] = 'unsorted'
  ) => {
    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      type,
      title,
      url,
      content,
      tags,
      status,
      created_at: new Date().toISOString()
    };

    const updated = [newItem, ...inboxItems];
    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('inbox_items').insert(newItem).then();
    }
  };

  const updateInboxItemStatus = async (id: string, status: InboxItem['status'], projectId?: string) => {
    const updated = inboxItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          project_id: projectId || item.project_id,
          snoozed_until: status === 'snoozed' ? new Date(Date.now() + 86400000).toISOString() : undefined
        };
      }
      return item;
    });

    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase
        .from('inbox_items')
        .update({
          status,
          project_id: projectId || null,
          snoozed_until: status === 'snoozed' ? new Date(Date.now() + 86400000).toISOString() : null
        })
        .eq('id', id)
        .then();
    }
  };

  const deleteInboxItem = async (id: string) => {
    const updated = inboxItems.filter((item) => item.id !== id);
    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('inbox_items').delete().eq('id', id).then();
    }
  };

  // ==========================================
  // PROJECTS & TASKS ACTIONS
  // ==========================================

  const addProject = async (
    area: Project['area'],
    name: string,
    description?: string,
    color: string = '#B8422E',
    client?: string,
    gain?: string,
    deadline?: string,
    status: Project['status'] = 'active'
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
      created_at: new Date().toISOString()
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    localStorage.setItem('heritage_projects', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('projects').insert(newProject).then();
    }
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'created_at'>>
  ) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, ...updates };
      }
      return p;
    });

    setProjects(updated);
    localStorage.setItem('heritage_projects', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('projects').update(updates).eq('id', projectId).then();
    }
  };

  const deleteProject = async (id: string) => {
    const updatedProj = projects.filter((p) => p.id !== id);
    // Tasks will cascades on delete in db, let's filter locally
    const updatedTasks = tasks.filter((t) => t.project_id !== id);
    
    setProjects(updatedProj);
    setTasks(updatedTasks);
    localStorage.setItem('heritage_projects', JSON.stringify(updatedProj));
    localStorage.setItem('heritage_tasks', JSON.stringify(updatedTasks));

    if (navigator.onLine) {
      supabase.from('projects').delete().eq('id', id).then();
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

    if (navigator.onLine) {
      supabase.from('tasks').insert(newTask).then();
    }
  };

  const updateTask = async (
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at'>>
  ) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, ...updates };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('tasks').update(updates).eq('id', taskId).then();
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    let updatedTasks = [...tasks];

    // Recurring task resets due date if checked off
    if (status === 'done' && originalTask.recurring !== 'none') {
      const baseDate = new Date(originalTask.due_date || Date.now());
      const today = new Date();
      // If the due date is in the past, base the next due date on today's date to avoid past scheduling loops
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
            status: 'todo' as const // Resets status to todo
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

    if (navigator.onLine) {
      const updatedItem = updatedTasks.find((t) => t.id === taskId);
      if (updatedItem) {
        supabase
          .from('tasks')
          .update({
            status: updatedItem.status,
            due_date: updatedItem.due_date
          })
          .eq('id', taskId)
          .then();
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

    if (navigator.onLine) {
      supabase.from('tasks').update({ pomodoro_sessions: count }).eq('id', taskId).then();
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

    if (navigator.onLine) {
      const target = updated.find((t) => t.id === taskId);
      if (target) {
        supabase.from('tasks').update({ is_pinned: target.is_pinned }).eq('id', taskId).then();
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    localStorage.setItem('heritage_tasks', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('tasks').delete().eq('id', taskId).then();
    }
  };

  // ==========================================
  // ACADEMY ACTIONS
  // ==========================================

  const addCourse = async (title: string, description?: string, category?: string) => {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      title,
      description,
      category,
      created_at: new Date().toISOString()
    };

    const updated = [...courses, newCourse];
    setCourses(updated);
    localStorage.setItem('heritage_courses', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('courses').insert(newCourse).then();
    }
  };

  const deleteCourse = async (id: string) => {
    const updatedC = courses.filter((c) => c.id !== id);
    setCourses(updatedC);
    localStorage.setItem('heritage_courses', JSON.stringify(updatedC));

    if (navigator.onLine) {
      supabase.from('courses').delete().eq('id', id).then();
    }
  };

  const addModule = async (courseId: string, title: string, orderIndex: number) => {
    const newModule: CourseModule = {
      id: crypto.randomUUID(),
      course_id: courseId,
      title,
      order_index: orderIndex,
      notes: ''
    };

    const updated = [...courseModules, newModule];
    setCourseModules(updated);
    localStorage.setItem('heritage_modules', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('course_modules').insert(newModule).then();
    }
  };

  const updateModuleNotes = async (moduleId: string, notes: string) => {
    const updated = courseModules.map((m) => {
      if (m.id === moduleId) {
        return { ...m, notes };
      }
      return m;
    });

    setCourseModules(updated);
    localStorage.setItem('heritage_modules', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('course_modules').update({ notes }).eq('id', moduleId).then();
    }
  };

  const addLesson = async (moduleId: string, title: string, link?: string) => {
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      module_id: moduleId,
      title,
      completed: false,
      link,
      created_at: new Date().toISOString()
    };

    const updated = [...lessons, newLesson];
    setLessons(updated);
    localStorage.setItem('heritage_lessons', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('lessons').insert(newLesson).then();
    }
  };

  const toggleLessonCompleted = async (lessonId: string, completed: boolean) => {
    const updated = lessons.map((l) => {
      if (l.id === lessonId) {
        return { ...l, completed };
      }
      return l;
    });

    setLessons(updated);
    localStorage.setItem('heritage_lessons', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('lessons').update({ completed }).eq('id', lessonId).then();
    }
  };

  const addFlashcard = async (courseId: string, moduleId: string, front: string, back: string) => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      course_id: courseId,
      module_id: moduleId,
      front,
      back,
      box: 1,
      next_review_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const updated = [...flashcards, newCard];
    setFlashcards(updated);
    localStorage.setItem('heritage_flashcards', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('flashcards').insert(newCard).then();
    }
  };

  const reviewFlashcard = async (flashcardId: string, correct: boolean) => {
    const updated = flashcards.map((fc) => {
      if (fc.id === flashcardId) {
        const nextBox = correct ? Math.min(5, fc.box + 1) : 1;
        // Spaced repetition interval in days based on Leitner box
        // Box 1: 1 day, Box 2: 2 days, Box 3: 4 days, Box 4: 7 days, Box 5: 14 days
        const intervals = [1, 2, 4, 7, 14];
        const daysToAdd = intervals[nextBox - 1];
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + daysToAdd);

        return {
          ...fc,
          box: nextBox,
          next_review_date: nextReview.toISOString()
        };
      }
      return fc;
    });

    setFlashcards(updated);
    localStorage.setItem('heritage_flashcards', JSON.stringify(updated));

    if (navigator.onLine) {
      const card = updated.find((fc) => fc.id === flashcardId);
      if (card) {
        supabase
          .from('flashcards')
          .update({
            box: card.box,
            next_review_date: card.next_review_date
          })
          .eq('id', flashcardId)
          .then();
      }
    }
  };

  // ==========================================
  // HABIT ACTIONS
  // ==========================================

  const addHabit = async (name: string, type: 'binary' | 'numeric', unit?: string, goal: number = 1) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      type,
      unit,
      goal,
      created_at: new Date().toISOString()
    };

    const updated = [...habits, newHabit];
    setHabits(updated);
    localStorage.setItem('heritage_habits', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('habits').insert(newHabit).then();
    }
  };

  const deleteHabit = async (id: string) => {
    const updatedH = habits.filter((h) => h.id !== id);
    const updatedRecords = habitRecords.filter((hr) => hr.habit_id !== id);
    setHabits(updatedH);
    setHabitRecords(updatedRecords);
    localStorage.setItem('heritage_habits', JSON.stringify(updatedH));
    localStorage.setItem('heritage_habit_records', JSON.stringify(updatedRecords));

    if (navigator.onLine) {
      supabase.from('habits').delete().eq('id', id).then();
    }
  };

  const recordHabitValue = async (habitId: string, date: string, value: number) => {
    const existingIndex = habitRecords.findIndex((hr) => hr.habit_id === habitId && hr.date === date);
    const updated = [...habitRecords];

    const recordId = existingIndex >= 0 ? habitRecords[existingIndex].id : crypto.randomUUID();
    const newRecord: HabitRecord = {
      id: recordId,
      habit_id: habitId,
      date,
      value,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newRecord;
    } else {
      updated.push(newRecord);
    }

    setHabitRecords(updated);
    localStorage.setItem('heritage_habit_records', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('habit_records').upsert(newRecord).then();
    }
  };

  const updateDailyLog = async (date: string, mood: number, sleepHours: number, waterIntake: number) => {
    const existingIndex = dailyLogs.findIndex((dl) => dl.date === date);
    const updated = [...dailyLogs];

    const newLog: DailyLog = {
      date,
      mood,
      sleep_hours: sleepHours,
      water_intake: waterIntake,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newLog;
    } else {
      updated.push(newLog);
    }

    setDailyLogs(updated);
    localStorage.setItem('heritage_daily_logs', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('daily_logs').upsert(newLog).then();
    }
  };

  // ==========================================
  // JOURNAL ACTIONS
  // ==========================================

  const updateJournalEntry = async (
    date: string,
    morningIntentions: string[],
    eveningReflectionsLearned: string[],
    eveningReflectionsBetter: string[],
    freeText?: string
  ) => {
    const existingIndex = journalEntries.findIndex((j) => j.date === date);
    const updated = [...journalEntries];

    const newEntry: JournalEntry = {
      date,
      morning_intentions: morningIntentions,
      evening_reflections_learned: eveningReflectionsLearned,
      evening_reflections_better: eveningReflectionsBetter,
      free_text: freeText,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newEntry;
    } else {
      updated.push(newEntry);
    }

    setJournalEntries(updated);
    localStorage.setItem('heritage_journal', JSON.stringify(updated));

    if (navigator.onLine) {
      supabase.from('journal_entries').upsert(newEntry).then();
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        loading,
        isOnline,
        syncPending,
        inboxItems,
        projects,
        tasks,
        courses,
        courseModules,
        lessons,
        flashcards,
        habits,
        habitRecords,
        dailyLogs,
        journalEntries,

        addInboxItem,
        updateInboxItemStatus,
        deleteInboxItem,

        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        updateTaskStatus,
        updateTaskPomodoro,
        togglePinTask,
        deleteTask,

        addCourse,
        deleteCourse,
        addModule,
        updateModuleNotes,
        addLesson,
        toggleLessonCompleted,
        addFlashcard,
        reviewFlashcard,

        addHabit,
        deleteHabit,
        recordHabitValue,
        updateDailyLog,

        updateJournalEntry
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
