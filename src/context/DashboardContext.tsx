'use client';

import React, { createContext, useContext } from 'react';
import { getLocalDateString } from '@/utils/dateUtils';
import { useToast } from './ToastContext';
import { useSystem, SystemProvider } from './SystemContext';
import { useInbox, InboxProvider, InboxItem } from './InboxContext';
import { useTaskProject, TaskProjectProvider, Task, Project } from './TaskProjectContext';
import { useAcademy, AcademyProvider, Course, CourseModule, Lesson, Flashcard } from './AcademyContext';
import { useHabit, HabitProvider, Habit, HabitRecord, DailyLog } from './HabitContext';
import { useJournal, JournalProvider, JournalEntry } from './JournalContext';
import { ResearchProvider } from './ResearchContext';

export { getLocalDateString };
export type { InboxItem, Project, Task, Course, CourseModule, Lesson, Flashcard, Habit, HabitRecord, DailyLog, JournalEntry };

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
  addInboxItem: (
    type: 'text' | 'url' | 'snippet',
    title: string,
    url?: string,
    content?: string,
    tags?: string[],
    status?: InboxItem['status']
  ) => Promise<void>;
  updateInboxItemStatus: (id: string, status: InboxItem['status'], projectId?: string, snoozedUntil?: string) => Promise<void>;
  updateInboxItem: (id: string, updates: Partial<Omit<InboxItem, 'id' | 'created_at'>>) => Promise<void>;
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
    category?: Task['category'],
    inboxItemId?: string
  ) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTaskPomodoro: (taskId: string, count: number) => Promise<void>;
  togglePinTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Academy operations
  addCourse: (title: string, description?: string, category?: string) => Promise<string>;
  deleteCourse: (id: string) => Promise<void>;
  addModule: (courseId: string, title: string, orderIndex: number) => Promise<string>;
  deleteModule: (id: string) => Promise<void>;
  updateModuleNotes: (moduleId: string, notes: string) => Promise<void>;
  addLesson: (moduleId: string, title: string, link?: string) => Promise<string>;
  deleteLesson: (id: string) => Promise<void>;
  toggleLessonCompleted: (lessonId: string, completed: boolean) => Promise<void>;
  addFlashcard: (courseId: string, moduleId: string, front: string, back: string) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  reviewFlashcard: (flashcardId: string, correct: boolean) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Omit<Course, 'id' | 'created_at'>>) => Promise<void>;
  updateModule: (id: string, updates: Partial<Omit<CourseModule, 'id' | 'created_at'>>) => Promise<void>;
  updateLesson: (id: string, updates: Partial<Omit<Lesson, 'id' | 'created_at'>>) => Promise<void>;

  // Habit operations
  addHabit: (name: string, type: 'binary' | 'numeric', unit?: string, goal?: number, category?: string, frequency?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  archiveHabit: (id: string, isArchived: boolean) => Promise<void>;
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
  deleteJournalEntry?: (date: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

const DashboardContextAggregator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useSystem();
  const inbox = useInbox();
  const taskProject = useTaskProject();
  const academy = useAcademy();
  const habit = useHabit();
  const journal = useJournal();

  const loading = inbox.loading || taskProject.loading || academy.loading || habit.loading || journal.loading;

  const { showToast } = useToast();

  const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(fn: T | undefined) => {
    if (!fn) return undefined;
    return async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (err: any) {
        console.error('Context mutation error:', err);
        showToast(err.message || 'An error occurred while saving data.', 'error');
      }
    };
  };

  const value: DashboardContextProps = {
    loading,
    isOnline: system.isOnline,
    syncPending: system.syncPending,
    
    inboxItems: inbox.inboxItems,
    addInboxItem: withErrorHandling(inbox.addInboxItem) as any,
    updateInboxItemStatus: withErrorHandling(inbox.updateInboxItemStatus) as any,
    deleteInboxItem: withErrorHandling(inbox.deleteInboxItem) as any,
    updateInboxItem: withErrorHandling(inbox.updateInboxItem) as any,

    projects: taskProject.projects,
    tasks: taskProject.tasks,
    addProject: withErrorHandling(taskProject.addProject) as any,
    updateProject: withErrorHandling(taskProject.updateProject) as any,
    deleteProject: withErrorHandling(taskProject.deleteProject) as any,
    archiveProject: withErrorHandling(taskProject.archiveProject) as any,
    addTask: withErrorHandling(taskProject.addTask) as any,
    updateTask: withErrorHandling(taskProject.updateTask) as any,
    updateTaskStatus: withErrorHandling(taskProject.updateTaskStatus) as any,
    updateTaskPomodoro: withErrorHandling(taskProject.updateTaskPomodoro) as any,
    togglePinTask: withErrorHandling(taskProject.togglePinTask) as any,
    deleteTask: withErrorHandling(taskProject.deleteTask) as any,

    courses: academy.courses,
    courseModules: academy.courseModules,
    lessons: academy.lessons,
    flashcards: academy.flashcards,
    addCourse: withErrorHandling(academy.addCourse) as any,
    deleteCourse: withErrorHandling(academy.deleteCourse) as any,
    addModule: withErrorHandling(academy.addModule) as any,
    deleteModule: withErrorHandling(academy.deleteModule) as any,
    updateModuleNotes: withErrorHandling(academy.updateModuleNotes) as any,
    addLesson: withErrorHandling(academy.addLesson) as any,
    deleteLesson: withErrorHandling(academy.deleteLesson) as any,
    toggleLessonCompleted: withErrorHandling(academy.toggleLessonCompleted) as any,
    addFlashcard: withErrorHandling(academy.addFlashcard) as any,
    deleteFlashcard: withErrorHandling(academy.deleteFlashcard) as any,
    reviewFlashcard: withErrorHandling(academy.reviewFlashcard) as any,
    updateCourse: withErrorHandling(academy.updateCourse) as any,
    updateModule: withErrorHandling(academy.updateModule) as any,
    updateLesson: withErrorHandling(academy.updateLesson) as any,

    habits: habit.habits,
    habitRecords: habit.habitRecords,
    dailyLogs: habit.dailyLogs,
    addHabit: withErrorHandling(habit.addHabit) as any,
    deleteHabit: withErrorHandling(habit.deleteHabit) as any,
    archiveHabit: withErrorHandling(habit.archiveHabit) as any,
    recordHabitValue: withErrorHandling(habit.recordHabitValue) as any,
    updateDailyLog: withErrorHandling(habit.updateDailyLog) as any,

    journalEntries: journal.journalEntries,
    updateJournalEntry: withErrorHandling(journal.updateJournalEntry) as any,
    deleteJournalEntry: withErrorHandling(journal.deleteJournalEntry) as any
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SystemProvider>
      <InboxProvider>
        <TaskProjectProvider>
          <AcademyProvider>
            <HabitProvider>
              <JournalProvider>
                <ResearchProvider>
                  <DashboardContextAggregator>{children}</DashboardContextAggregator>
                </ResearchProvider>
              </JournalProvider>
            </HabitProvider>
          </AcademyProvider>
        </TaskProjectProvider>
      </InboxProvider>
    </SystemProvider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
