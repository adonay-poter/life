'use client';

import React, { createContext, useContext } from 'react';
import { getLocalDateString } from '@/utils/dateUtils';
import { useSystem, SystemProvider } from './SystemContext';
import { useInbox, InboxProvider, InboxItem } from './InboxContext';
import { useTaskProject, TaskProjectProvider, Task, Project } from './TaskProjectContext';
import { useAcademy, AcademyProvider, Course, CourseModule, Lesson, Flashcard } from './AcademyContext';
import { useHabit, HabitProvider, Habit, HabitRecord, DailyLog } from './HabitContext';
import { useJournal, JournalProvider, JournalEntry } from './JournalContext';

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

  const value: DashboardContextProps = {
    loading,
    isOnline: system.isOnline,
    syncPending: system.syncPending,
    
    inboxItems: inbox.inboxItems,
    addInboxItem: inbox.addInboxItem,
    updateInboxItemStatus: inbox.updateInboxItemStatus,
    deleteInboxItem: inbox.deleteInboxItem,

    projects: taskProject.projects,
    tasks: taskProject.tasks,
    addProject: taskProject.addProject,
    updateProject: taskProject.updateProject,
    deleteProject: taskProject.deleteProject,
    archiveProject: taskProject.archiveProject,
    addTask: taskProject.addTask,
    updateTask: taskProject.updateTask,
    updateTaskStatus: taskProject.updateTaskStatus,
    updateTaskPomodoro: taskProject.updateTaskPomodoro,
    togglePinTask: taskProject.togglePinTask,
    deleteTask: taskProject.deleteTask,

    courses: academy.courses,
    courseModules: academy.courseModules,
    lessons: academy.lessons,
    flashcards: academy.flashcards,
    addCourse: academy.addCourse,
    deleteCourse: academy.deleteCourse,
    addModule: academy.addModule,
    updateModuleNotes: academy.updateModuleNotes,
    addLesson: academy.addLesson,
    toggleLessonCompleted: academy.toggleLessonCompleted,
    addFlashcard: academy.addFlashcard,
    reviewFlashcard: academy.reviewFlashcard,

    habits: habit.habits,
    habitRecords: habit.habitRecords,
    dailyLogs: habit.dailyLogs,
    addHabit: habit.addHabit,
    deleteHabit: habit.deleteHabit,
    archiveHabit: habit.archiveHabit,
    recordHabitValue: habit.recordHabitValue,
    updateDailyLog: habit.updateDailyLog,

    journalEntries: journal.journalEntries,
    updateJournalEntry: journal.updateJournalEntry,
    deleteJournalEntry: journal.deleteJournalEntry
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
                <DashboardContextAggregator>{children}</DashboardContextAggregator>
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
