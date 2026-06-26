'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';
import { useToast } from './ToastContext';

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

interface AcademyContextProps {
  courses: Course[];
  courseModules: CourseModule[];
  lessons: Lesson[];
  flashcards: Flashcard[];
  loading: boolean;
  addCourse: (title: string, description?: string, category?: string) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addModule: (courseId: string, title: string, orderIndex: number) => Promise<void>;
  updateModuleNotes: (moduleId: string, notes: string) => Promise<void>;
  addLesson: (moduleId: string, title: string, link?: string) => Promise<void>;
  toggleLessonCompleted: (lessonId: string, completed: boolean) => Promise<void>;
  addFlashcard: (courseId: string, moduleId: string, front: string, back: string) => Promise<void>;
  reviewFlashcard: (flashcardId: string, correct: boolean) => Promise<void>;
}

const AcademyContext = createContext<AcademyContextProps | undefined>(undefined);

export const useAcademy = () => {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
};

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

export const AcademyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resCourses, resModules, resLessons, resFlashcards] = await Promise.all([
          supabase.from('courses').select('*'),
          supabase.from('course_modules').select('*'),
          supabase.from('lessons').select('*'),
          supabase.from('flashcards').select('*')
        ]);

        const hasData = resCourses.data && resCourses.data.length > 0;

        if (hasData) {
          setCourses(resCourses.data || []);
          setCourseModules(resModules.data || []);
          setLessons(resLessons.data || []);
          setFlashcards(resFlashcards.data || []);

          localStorage.setItem('heritage_courses', JSON.stringify(resCourses.data || []));
          localStorage.setItem('heritage_modules', JSON.stringify(resModules.data || []));
          localStorage.setItem('heritage_lessons', JSON.stringify(resLessons.data || []));
          localStorage.setItem('heritage_flashcards', JSON.stringify(resFlashcards.data || []));
        } else {
          const localCourses = localStorage.getItem('heritage_courses');
          const localModules = localStorage.getItem('heritage_modules');
          const localLessons = localStorage.getItem('heritage_lessons');
          const localFlashcards = localStorage.getItem('heritage_flashcards');

          setCourses(localCourses ? JSON.parse(localCourses) : MOCK_COURSES);
          setCourseModules(localModules ? JSON.parse(localModules) : MOCK_MODULES);
          setLessons(localLessons ? JSON.parse(localLessons) : MOCK_LESSONS);
          setFlashcards(localFlashcards ? JSON.parse(localFlashcards) : MOCK_FLASHCARDS);

          if (!localCourses && isOnline) {
            await Promise.all([
              supabase.from('courses').upsert(MOCK_COURSES),
              supabase.from('course_modules').upsert(MOCK_MODULES),
              supabase.from('lessons').upsert(MOCK_LESSONS),
              supabase.from('flashcards').upsert(MOCK_FLASHCARDS)
            ]);
          }
        }
      } catch (err) {
        console.warn('Recovering academy from cache:', err);
        const localCourses = localStorage.getItem('heritage_courses');
        const localModules = localStorage.getItem('heritage_modules');
        const localLessons = localStorage.getItem('heritage_lessons');
        const localFlashcards = localStorage.getItem('heritage_flashcards');

        setCourses(localCourses ? JSON.parse(localCourses) : MOCK_COURSES);
        setCourseModules(localModules ? JSON.parse(localModules) : MOCK_MODULES);
        setLessons(localLessons ? JSON.parse(localLessons) : MOCK_LESSONS);
        setFlashcards(localFlashcards ? JSON.parse(localFlashcards) : MOCK_FLASHCARDS);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, refreshKey]);

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

    if (isOnline) {
      const { error } = await supabase.from('courses').insert(newCourse);
        if (error) throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    const updatedC = courses.filter((c) => c.id !== id);
    setCourses(updatedC);
    localStorage.setItem('heritage_courses', JSON.stringify(updatedC));

    if (isOnline) {
      const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) throw error;
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

    if (isOnline) {
      const { error } = await supabase.from('course_modules').insert(newModule);
        if (error) throw error;
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

    if (isOnline) {
      const { error } = await supabase.from('course_modules').update({ notes }).eq('id', moduleId);
        if (error) throw error;
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

    if (isOnline) {
      const { error } = await supabase.from('lessons').insert(newLesson);
        if (error) throw error;
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

    if (isOnline) {
      const { error } = await supabase.from('lessons').update({ completed }).eq('id', lessonId);
        if (error) throw error;
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

    if (isOnline) {
      const { error } = await supabase.from('flashcards').insert(newCard);
        if (error) throw error;
    }
  };

  const reviewFlashcard = async (flashcardId: string, correct: boolean) => {
    const updated = flashcards.map((fc) => {
      if (fc.id === flashcardId) {
        const nextBox = correct ? Math.min(5, fc.box + 1) : 1;
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

    if (isOnline) {
      const card = updated.find((fc) => fc.id === flashcardId);
      if (card) {
        const { error } = await supabase
          .from('flashcards')
          .update({
            box: card.box,
            next_review_date: card.next_review_date
          })
          .eq('id', flashcardId);
        if (error) throw error;
      }
    }
  };

  return (
    <AcademyContext.Provider
      value={{
        courses,
        courseModules,
        lessons,
        flashcards,
        loading,
        addCourse,
        deleteCourse,
        addModule,
        updateModuleNotes,
        addLesson,
        toggleLessonCompleted,
        addFlashcard,
        reviewFlashcard
      }}
    >
      {children}
    </AcademyContext.Provider>
  );
};
