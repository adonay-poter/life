'use client';

import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDashboard, CourseModule, Lesson } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ResearchModal from '@/components/ResearchModal';
import QAPanel from '@/components/QAPanel';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import StalenessSignalBadge from '@/components/ui/StalenessSignalBadge';
import { 
  BookOpen, 
  HelpCircle, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  ExternalLink,
  Eye,
  Edit3,
  ArrowUp,
  ArrowDown,
  Search,
  History,
  Upload,
  FileText,
  Clock,
  Sparkles,
  Inbox,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Type,
  List,
  X
} from 'lucide-react';

function AcademyContent() {
  const {
    courses,
    courseModules,
    lessons,
    flashcards,
    loading,
    addCourse,
    deleteCourse,
    addModule,
    deleteModule,
    updateModuleNotes,
    addLesson,
    deleteLesson,
    toggleLessonCompleted,
    addFlashcard,
    deleteFlashcard,
    reviewFlashcard,
    updateCourse,
    updateModule,
    updateLesson,
    knowledgeItems,
    addKnowledgeItem,
    deleteKnowledgeItem,
    updateInboxItemStatus,
    inboxItems,
    dailyDigests
  } = useDashboard();

  const searchParams = useSearchParams();
  const targetCourseId = searchParams ? searchParams.get('courseId') : null;
  const targetModuleId = searchParams ? searchParams.get('moduleId') : null;
  const { showToast } = useToast();

  // Delete confirmation modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string; type: 'course' | 'module' | 'lesson' | 'flashcard' } | null>(null);

  // Edit Course Modal states
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<any | null>(null);

  // New Module Modal state
  const [newModuleModalOpen, setNewModuleModalOpen] = useState(false);

  // Research Modal state
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseCategory, setEditCourseCategory] = useState('');

  // Inline editing states
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonLink, setEditLessonLink] = useState('');

  // Navigation & UI States
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [academyTab, setAcademyTab] = useState<'matrix' | 'flashcards' | 'knowledge'>('matrix');
  const [isNotePreview, setIsNotePreview] = useState(false);
  const [mobileStudioTab, setMobileStudioTab] = useState<'index' | 'notepad'>('index');
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState(18);
  const [readerLineHeight, setReaderLineHeight] = useState<'relaxed' | 'loose'>('loose');
  const [readerWidth, setReaderWidth] = useState<'focused' | 'wide'>('focused');
  const [showReaderSettings, setShowReaderSettings] = useState(false);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeModule = courseModules.find((m) => m.id === selectedModuleId);

  const [localNotes, setLocalNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const notesRef = useRef(localNotes);
  const activeModuleIdRef = useRef(activeModule?.id);
  const courseModulesRef = useRef(courseModules);
  const readerViewportRef = useRef<HTMLDivElement | null>(null);

  // Sync refs
  const lastSavedNotesRef = useRef(localNotes);

  useEffect(() => {
    notesRef.current = localNotes;
  }, [localNotes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedFontSize = window.localStorage.getItem('heritage_reader_font_size');
    const savedLineHeight = window.localStorage.getItem('heritage_reader_line_height');
    const savedWidth = window.localStorage.getItem('heritage_reader_width');

    if (savedFontSize) {
      const parsed = Number(savedFontSize);
      if (!Number.isNaN(parsed)) {
        setReaderFontSize(Math.min(24, Math.max(14, parsed)));
      }
    }
    if (savedLineHeight === 'relaxed' || savedLineHeight === 'loose') {
      setReaderLineHeight(savedLineHeight);
    }
    if (savedWidth === 'focused' || savedWidth === 'wide') {
      setReaderWidth(savedWidth);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('heritage_reader_font_size', String(readerFontSize));
    window.localStorage.setItem('heritage_reader_line_height', readerLineHeight);
    window.localStorage.setItem('heritage_reader_width', readerWidth);
  }, [readerFontSize, readerLineHeight, readerWidth]);

  // Sync external changes to notes (e.g. from AI Research Agent)
  useEffect(() => {
    const activeModuleNotes = activeModule?.notes;
    if (activeModuleNotes !== undefined) {
      // If the notes changed in the database, and it's not the same as what we just saved,
      // it means it was updated externally (like by the Research Agent)
      if (activeModuleNotes !== lastSavedNotesRef.current && activeModuleNotes !== notesRef.current) {
        setLocalNotes(activeModuleNotes);
        lastSavedNotesRef.current = activeModuleNotes;
      }
    }
  }, [activeModule?.notes]);

  useEffect(() => {
    courseModulesRef.current = courseModules;
  }, [courseModules]);

  // Load notes into local state when module selection changes
  useEffect(() => {
    const prevModuleId = activeModuleIdRef.current;
    if (prevModuleId && prevModuleId !== activeModule?.id) {
      const prevModule = courseModules.find((m) => m.id === prevModuleId);
      if (prevModule && notesRef.current !== (prevModule.notes || '')) {
        updateModuleNotes(prevModuleId, notesRef.current);
      }
    }

    if (activeModule) {
      // Only set localNotes if we're actually switching to a different module
      if (activeModuleIdRef.current !== activeModule.id) {
        setLocalNotes(activeModule.notes || '');
        lastSavedNotesRef.current = activeModule.notes || '';
      }
      activeModuleIdRef.current = activeModule.id;
    } else {
      setLocalNotes('');
      activeModuleIdRef.current = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModuleId, activeModule?.id]);

  // Debounced save
  useEffect(() => {
    if (!activeModule) return;
    if (localNotes === (activeModule.notes || '')) return;

    setIsSavingNotes(true);
    const timer = setTimeout(async () => {
      lastSavedNotesRef.current = localNotes;
      await updateModuleNotes(activeModule.id, localNotes);
      setIsSavingNotes(false);
      
      // Save version history in localStorage
      const historyKey = `heritage_notes_history_${activeModule.id}`;
      const historyRaw = localStorage.getItem(historyKey);
      let history: { timestamp: string; notes: string }[] = historyRaw ? JSON.parse(historyRaw) : [];
      if (history.length === 0 || history[0].notes !== localNotes) {
        history.unshift({
          timestamp: new Date().toISOString(),
          notes: localNotes
        });
        history = history.slice(0, 10);
        localStorage.setItem(historyKey, JSON.stringify(history));
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localNotes]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (activeModuleIdRef.current) {
        const mod = courseModulesRef.current.find((m) => m.id === activeModuleIdRef.current);
        if (mod && notesRef.current !== (mod.notes || '')) {
          updateModuleNotes(activeModuleIdRef.current, notesRef.current);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Form states
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('');

  const [newModuleName, setNewModuleName] = useState('');
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonLink, setNewLessonLink] = useState('');

  // Flashcard states
  const [fcQuestion, setFcQuestion] = useState('');
  const [fcAnswer, setFcAnswer] = useState('');
  const [fcModuleId, setFcModuleId] = useState<string>('');
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBulkImport, setIsBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-set fcModuleId when selectedModuleId changes
  useEffect(() => {
    if (selectedModuleId) {
      setFcModuleId(selectedModuleId);
    }
  }, [selectedModuleId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );

      // Ctrl+S / Cmd+S to save notepad notes immediately
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        if (selectedModuleId && activeModule) {
          e.preventDefault();
          setIsSavingNotes(true);
          updateModuleNotes(activeModule.id, localNotes);
          setIsSavingNotes(false);
          showToast('Notes saved immediately.', 'success');
          return;
        }
      }

      if (e.key === 'Escape') {
        if (showReaderSettings) {
          e.preventDefault();
          setShowReaderSettings(false);
          return;
        }
        if (isReaderOpen) {
          e.preventDefault();
          setIsReaderOpen(false);
          return;
        }
        if (newModuleModalOpen) {
          e.preventDefault();
          setNewModuleModalOpen(false);
          setNewModuleName('');
          return;
        }
        if (deleteModalOpen) {
          e.preventDefault();
          setDeleteModalOpen(false);
          return;
        }
        if (editCourseModalOpen) {
          e.preventDefault();
          setEditCourseModalOpen(false);
          return;
        }
        if (editingModuleId) {
          e.preventDefault();
          setEditingModuleId(null);
          return;
        }
        if (editingLessonId) {
          e.preventDefault();
          setEditingLessonId(null);
          return;
        }
        if (showAddCourse) {
          e.preventDefault();
          setShowAddCourse(false);
          return;
        }
        if (isTyping) {
          (activeEl as HTMLElement).blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedModuleId,
    activeModule,
    localNotes,
    newModuleModalOpen,
    deleteModalOpen,
    editCourseModalOpen,
    editingModuleId,
    editingLessonId,
    showAddCourse,
    isReaderOpen,
    showReaderSettings,
    showToast,
    updateModuleNotes
  ]);

  useEffect(() => {
    if (!isReaderOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('academy-reader-open');
    if (readerViewportRef.current) {
      readerViewportRef.current.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('academy-reader-open');
    };
  }, [isReaderOpen, selectedModuleId]);

  // Clear search on tab/course change
  useEffect(() => {
    setSearchQuery('');
  }, [selectedCourseId, academyTab]);

  // URL Target Course & Module Auto-select Effect
  useEffect(() => {
    if (targetCourseId) {
      const course = courses.find((c) => c.id === targetCourseId);
      if (course) {
        setSelectedCourseId(targetCourseId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (targetModuleId) {
          const mod = courseModules.find((m) => m.course_id === targetCourseId && m.id === targetModuleId);
          if (mod) {
            setSelectedModuleId(targetModuleId);
            return;
          }
        }
        
        const modules = courseModules.filter((m) => m.course_id === targetCourseId);
        if (modules.length > 0) {
          setSelectedModuleId(modules[0].id);
        }
      }
    }
  }, [targetCourseId, targetModuleId, courses, courseModules]);

  // ==========================================
  // FORM ACTIONS
  // ==========================================
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    addCourse(newCourseTitle, newCourseDesc, newCourseCategory || 'General');
    showToast('New skill matrix created successfully.', 'success');
    setNewCourseTitle('');
    setNewCourseDesc('');
    setNewCourseCategory('');
    setShowAddCourse(false);
  };

  const handleAddModule = (courseId: string) => {
    if (!newModuleName.trim()) {
      showToast('Module name cannot be empty.', 'error');
      return;
    }
    const currentModules = courseModules.filter((m) => m.course_id === courseId);
    addModule(courseId, newModuleName, currentModules.length + 1);
    showToast('Module added successfully.', 'success');
    setNewModuleName('');
  };

  const formatAndValidateUrl = (url: string): { isValid: boolean; formatted: string } => {
    if (!url) return { isValid: true, formatted: '' };
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    try {
      new URL(clean);
      return { isValid: true, formatted: clean };
    } catch {
      return { isValid: false, formatted: url };
    }
  };

  const handleAddLesson = (moduleId: string) => {
    if (!newLessonName.trim()) {
      showToast('Lesson name cannot be empty.', 'error');
      return;
    }
    if (newLessonLink.trim()) {
      const { isValid, formatted } = formatAndValidateUrl(newLessonLink);
      if (!isValid) {
        showToast('Please enter a valid URL (including http:// or https://).', 'error');
        return;
      }
      addLesson(moduleId, newLessonName, formatted);
    } else {
      addLesson(moduleId, newLessonName, undefined);
    }
    showToast('Lesson added successfully.', 'success');
    setNewLessonName('');
    setNewLessonLink('');
  };

  const handleAddFlashcardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcQuestion.trim() || !fcAnswer.trim() || !selectedCourseId || !fcModuleId) {
      showToast('Please fill out all required flashcard fields.', 'error');
      return;
    }
    addFlashcard(selectedCourseId, fcModuleId, fcQuestion, fcAnswer);
    showToast('Flashcard saved successfully.', 'success');
    setFcQuestion('');
    setFcAnswer('');
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !fcModuleId || !bulkText.trim()) return;

    const lines = bulkText.split('\n');
    let count = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      let front = '';
      let back = '';

      if (line.includes('\t')) {
        const parts = line.split('\t');
        front = parts[0].trim();
        back = parts.slice(1).join('\t').trim();
      } else if (line.includes(',')) {
        const parts = line.split(',');
        front = parts[0].trim();
        back = parts.slice(1).join(',').trim();
      }

      if (front && back) {
        await addFlashcard(selectedCourseId, fcModuleId, front, back);
        count++;
      }
    }

    if (count > 0) {
      showToast(`Successfully imported ${count} flashcards.`, 'success');
      setBulkText('');
      setIsBulkImport(false);
    } else {
      showToast('No valid flashcards found. Use comma or tab separation.', 'error');
    }
  };

  const handleReorderModule = async (moduleId: string, direction: 'up' | 'down') => {
    const mod = courseModules.find((m) => m.id === moduleId);
    if (!mod) return;

    const courseMods = courseModules
      .filter((m) => m.course_id === mod.course_id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const idx = courseMods.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;

    let sibling: CourseModule | null = null;
    if (direction === 'up' && idx > 0) {
      sibling = courseMods[idx - 1];
    } else if (direction === 'down' && idx < courseMods.length - 1) {
      sibling = courseMods[idx + 1];
    }

    if (sibling) {
      const currentOrder = mod.order_index || 0;
      const siblingOrder = sibling.order_index || 0;

      await updateModule(mod.id, { order_index: siblingOrder });
      await updateModule(sibling.id, { order_index: currentOrder });
      showToast('Module reordered.', 'success');
    }
  };

  const handleReorderLesson = async (lessonId: string, direction: 'up' | 'down') => {
    const les = lessons.find((l) => l.id === lessonId);
    if (!les) return;

    const moduleLessons = lessons
      .filter((l) => l.module_id === les.module_id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const idx = moduleLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) return;

    let sibling: Lesson | null = null;
    if (direction === 'up' && idx > 0) {
      sibling = moduleLessons[idx - 1];
    } else if (direction === 'down' && idx < moduleLessons.length - 1) {
      sibling = moduleLessons[idx + 1];
    }

    if (sibling) {
      const currentOrder = les.order_index || 0;
      const siblingOrder = sibling.order_index || 0;

      await updateLesson(les.id, { order_index: siblingOrder });
      await updateLesson(sibling.id, { order_index: currentOrder });
      showToast('Lesson reordered.', 'success');
    }
  };

  // ==========================================
  // PROGRESS MATHEMATICS (Weighted)
  // ==========================================
  const calculateCourseProgress = (courseId: string) => {
    const courseModulesList = courseModules.filter((m) => m.course_id === courseId);
    if (courseModulesList.length === 0) return 0;
    
    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    courseModulesList.forEach((m) => {
      const moduleLessons = lessons.filter((l) => l.module_id === m.id);
      totalLessonsCount += moduleLessons.length;
      completedLessonsCount += moduleLessons.filter((l) => l.completed).length;
    });

    return totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;
  };

  // ==========================================
  // SIMPLE MARKDOWN PARSER FOR PREVIEW
  // ==========================================
  const getHeadingId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  const renderMarkdownInline = (text: string) => {
    if (!text) return '';
    
    // Build array of formatted text parts using flatMap passes
    let parts: { type: 'text' | 'bold' | 'italic' | 'code' | 'footnote' | 'link'; content: string; url?: string }[] = [
      { type: 'text', content: text }
    ];

    // 1. Parse Footnotes [[^1]] or [^1]
    parts = parts.flatMap(part => {
      if (part.type !== 'text') return [part];
      const res: typeof parts = [];
      const regex = /(?:\[\[\^|\[\^)(.*?)(?:\]\]|\])/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          res.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
        }
        res.push({ type: 'footnote', content: match[1] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.content.length) {
        res.push({ type: 'text', content: part.content.slice(lastIndex) });
      }
      return res;
    });

    // 2. Parse Inline Code `code`
    parts = parts.flatMap(part => {
      if (part.type !== 'text') return [part];
      const res: typeof parts = [];
      const regex = /`(.*?)`/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          res.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
        }
        res.push({ type: 'code', content: match[1] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.content.length) {
        res.push({ type: 'text', content: part.content.slice(lastIndex) });
      }
      return res;
    });

    // 3. Parse Bold **bold**
    parts = parts.flatMap(part => {
      if (part.type !== 'text') return [part];
      const res: typeof parts = [];
      const regex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          res.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
        }
        res.push({ type: 'bold', content: match[1] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.content.length) {
        res.push({ type: 'text', content: part.content.slice(lastIndex) });
      }
      return res;
    });

    // 4. Parse Italic *italic* or _italic_
    parts = parts.flatMap(part => {
      if (part.type !== 'text') return [part];
      const res: typeof parts = [];
      const regex = /\*(.*?)\*|_(.*?)_/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          res.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
        }
        res.push({ type: 'italic', content: match[1] || match[2] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.content.length) {
        res.push({ type: 'text', content: part.content.slice(lastIndex) });
      }
      return res;
    });

    // 5. Parse Links [text](url)
    parts = parts.flatMap(part => {
      if (part.type !== 'text') return [part];
      const res: typeof parts = [];
      const regex = /\[(.*?)\]\((.*?)\)/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          res.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
        }
        res.push({ type: 'link', content: match[1], url: match[2] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.content.length) {
        res.push({ type: 'text', content: part.content.slice(lastIndex) });
      }
      return res;
    });

    return parts.map((part, index) => {
      switch (part.type) {
        case 'bold':
          return <strong key={index} className="font-bold text-primary">{part.content}</strong>;
        case 'italic':
          return <em key={index} className="italic text-primary">{part.content}</em>;
        case 'code':
          return <code key={index} className="bg-neutral-bg/70 px-1 py-0.5 rounded font-mono text-[10px] text-tertiary border border-secondary/15">{part.content}</code>;
        case 'footnote':
          return <sup key={index} className="text-[9px] font-bold text-tertiary ml-0.5 select-none" title={`Reference Reference ${part.content}`}>[{part.content}]</sup>;
        case 'link':
          return <a key={index} href={part.url} target="_blank" rel="noopener noreferrer" className="text-tertiary hover:underline">{part.content}</a>;
        default:
          return part.content;
      }
    });
  };

  const renderMarkdown = (
    text: string,
    options?: {
      paragraphClassName?: string;
      heading1ClassName?: string;
      heading2ClassName?: string;
      heading3ClassName?: string;
      listClassName?: string;
      blockquoteClassName?: string;
      codeBlockClassName?: string;
      tableClassName?: string;
      emptyClassName?: string;
    }
  ) => {
    if (!text) return <p className={options?.emptyClassName || 'italic text-secondary'}>Empty notepad. Input notes on edit view...</p>;
    
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 1. Code Block
      if (line.trim().startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <pre key={`code-${i}`} className={`bg-neutral-bg/60 border border-secondary/20 p-3 rounded-sm font-mono text-[11px] text-primary overflow-x-auto my-3 leading-relaxed whitespace-pre ${options?.codeBlockClassName || ''}`}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        i++; // skip ending ```
        continue;
      }

      // 2. Table Block
      if (line.trim().startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        
        if (tableLines.length > 0) {
          const parsedRows = tableLines.map(row => {
            return row.split('|')
              .map(cell => cell.trim())
              .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          });

          let hasHeader = false;
          let headerRow: string[] = [];
          let dataRows = parsedRows;

          if (tableLines.length > 1 && tableLines[1].includes('-')) {
            hasHeader = true;
            headerRow = parsedRows[0];
            dataRows = parsedRows.slice(2);
          }

          elements.push(
            <div key={`table-${i}`} className={`overflow-x-auto my-3 border border-secondary/25 rounded-sm ${options?.tableClassName || ''}`}>
              <table className="w-full text-left border-collapse text-[11px] font-sans">
                {hasHeader && (
                  <thead>
                    <tr className="bg-neutral-bg/40 border-b border-secondary/35">
                      {headerRow.map((cell, cIdx) => (
                        <th key={cIdx} className="px-3 py-2 font-bold text-primary border-r border-secondary/15 last:border-r-0">
                          {renderMarkdownInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-secondary/10 last:border-b-0 hover:bg-neutral-bg/10">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-primary border-r border-secondary/10 last:border-r-0">
                          {renderMarkdownInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // 3. Blockquote
      if (line.trim().startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().slice(1).trim());
          i++;
        }
        elements.push(
          <blockquote key={`quote-${i}`} className={`border-l-2 border-tertiary pl-3 py-1 bg-neutral-bg/50 font-sans text-xs italic text-secondary my-3 ${options?.blockquoteClassName || ''}`}>
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="my-0.5">{renderMarkdownInline(ql)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // 4. Bullets (List)
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('-') || lines[i].trim().startsWith('*'))) {
          listItems.push(lines[i].trim().slice(1).trim());
          i++;
        }
        elements.push(
          <ul key={`list-${i}`} className={`list-disc pl-5 my-2 text-xs space-y-1 ${options?.listClassName || ''}`}>
            {listItems.map((item, lIdx) => (
              <li key={lIdx} className="text-primary font-sans">
                {renderMarkdownInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 5. Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h4 id={getHeadingId(line.slice(2))} key={i} className={`font-display text-lg font-bold text-primary mt-4 mb-2 border-b border-secondary/15 pb-1 scroll-mt-24 ${options?.heading1ClassName || ''}`}>
            {renderMarkdownInline(line.slice(2))}
          </h4>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h5 id={getHeadingId(line.slice(3))} key={i} className={`font-display text-md font-bold text-primary mt-3.5 mb-1.5 scroll-mt-24 ${options?.heading2ClassName || ''}`}>
            {renderMarkdownInline(line.slice(3))}
          </h5>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h6 id={getHeadingId(line.slice(4))} key={i} className={`font-sans text-xs font-bold text-primary mt-3 mb-1 scroll-mt-24 ${options?.heading3ClassName || ''}`}>
            {renderMarkdownInline(line.slice(4))}
          </h6>
        );
        i++;
        continue;
      }

      // 6. Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        elements.push(<hr key={i} className="my-4 border-t border-secondary/25" />);
        i++;
        continue;
      }

      // 7. Regular paragraph
      if (line.trim() !== '') {
        elements.push(
          <p key={i} className={`font-sans text-xs text-primary min-h-[1em] leading-relaxed my-2 ${options?.paragraphClassName || ''}`}>
            {renderMarkdownInline(line)}
          </p>
        );
      } else {
        elements.push(<div key={i} className="h-2" />);
      }
      i++;
    }

    return elements;
  };

  // Find due flashcards
  const getDueFlashcards = () => {
    const now = new Date();
    return flashcards.filter((fc) => {
      const isCourseMatch = !selectedCourseId || fc.course_id === selectedCourseId;
      const isDue = isCourseMatch && new Date(fc.next_review_date) <= now;
      if (!isDue) return false;
      if (!searchQuery) return true;
      return fc.front.toLowerCase().includes(searchQuery.toLowerCase()) || 
             fc.back.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const dueCards = getDueFlashcards();
  const activeCard = dueCards[activeFlashcardIndex];

  // Notes history retrieval helper
  const getNotesHistory = () => {
    if (!activeModule) return [];
    const historyKey = `heritage_notes_history_${activeModule.id}`;
    const historyRaw = localStorage.getItem(historyKey);
    return historyRaw ? JSON.parse(historyRaw) : [];
  };
  const notesHistory = getNotesHistory();

  const activeCourseModules = selectedCourseId
    ? courseModules
        .filter((m) => m.course_id === selectedCourseId)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    : [];
  const activeCourseLessons = activeCourseModules.flatMap((module) =>
    lessons
      .filter((lesson) => lesson.module_id === module.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  );
  const completedActiveLessons = activeCourseLessons.filter((lesson) => lesson.completed).length;
  const activeCourseCards = selectedCourseId
    ? flashcards.filter((card) => card.course_id === selectedCourseId)
    : [];
  const activeModuleIndex = activeCourseModules.findIndex((module) => module.id === selectedModuleId);
  const previousModule = activeModuleIndex > 0 ? activeCourseModules[activeModuleIndex - 1] : null;
  const nextModule = activeModuleIndex >= 0 && activeModuleIndex < activeCourseModules.length - 1
    ? activeCourseModules[activeModuleIndex + 1]
    : null;
  const noteWordCount = localNotes.trim() ? localNotes.trim().split(/\s+/).length : 0;
  const estimatedReadMinutes = Math.max(1, Math.ceil(noteWordCount / 220));
  const noteHeadings = localNotes
    .split('\n')
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (!match) return null;
      return {
        level: match[1].length,
        title: match[2].trim()
      };
    })
    .filter((heading): heading is { level: number; title: string } => Boolean(heading));

  // Flashcards statistics calculation
  const courseCards = flashcards.filter(fc => fc.course_id === selectedCourseId);
  const totalCards = courseCards.length;
  
  const boxCounts = [1, 2, 3, 4, 5].map(b => courseCards.filter(fc => fc.box === b).length);
  const masteredCount = courseCards.filter(fc => fc.box >= 4).length;
  const masteryRate = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;
  
  const totalReviews = courseCards.reduce((sum, fc) => sum + (fc.total_reviews || 0), 0);
  const correctReviews = courseCards.reduce((sum, fc) => sum + (fc.correct_reviews || 0), 0);
  const accuracyRate = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

  if (loading) {
    return (
      <PageShell>
        <SectionHeader
          title="The Academy"
          subtitle="Course Matrices • Spaced Repetition Flashcards"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface border border-border p-6 rounded-none space-y-4 shadow-none">
              <div className="h-4 bg-secondary/15 w-1/4 rounded-none" />
              <div className="h-6 bg-secondary/15 w-3/4 rounded-none" />
              <div className="h-16 bg-secondary/10 w-full rounded-none" />
              <div className="h-8 bg-secondary/10 w-full rounded-none" />
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header / Navigation state */}
      {!selectedCourseId ? (
        <SectionHeader
          title="The Academy"
          subtitle="Course Matrices • Spaced Repetition Flashcards"
          action={
            <div className="flex border border-border font-label text-xs uppercase tracking-wider select-none shrink-0 rounded-none bg-background overflow-hidden">
              <button
                onClick={() => setAcademyTab('matrix')}
                className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all cursor-pointer btn-press font-bold ${
                  academyTab === 'matrix' ? 'bg-primary text-on-primary font-bold' : 'text-primary hover:bg-neutral-bg/50'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Matrices</span>
              </button>
              <button
                onClick={() => setAcademyTab('knowledge')}
                className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all border-l border-border cursor-pointer btn-press font-bold ${
                  academyTab === 'knowledge' ? 'bg-primary text-on-primary font-bold' : 'text-primary hover:bg-neutral-bg/50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Knowledge Base</span>
              </button>
              <button
                onClick={() => setAcademyTab('flashcards')}
                className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all border-l border-border cursor-pointer btn-press font-bold ${
                  academyTab === 'flashcards' ? 'bg-primary text-on-primary font-bold' : 'text-primary hover:bg-neutral-bg/50'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>All Flashcards ({dueCards.length})</span>
              </button>
            </div>
          }
        />
      ) : (
        <header className="border-b border-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setSelectedModuleId(null);
              }}
              className="text-secondary hover:text-accent transition-all p-1 cursor-pointer btn-press"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="truncate max-w-full">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-primary truncate max-w-xs md:max-w-md lg:max-w-lg uppercase">
                {activeCourse?.title}
              </h2>
              <p className="font-label text-[10px] text-secondary uppercase tracking-[0.25em] font-bold">
                STUDIO WORKSPACE &bull; {activeCourse?.category}
              </p>
            </div>
          </div>

          <div className="flex border border-border font-label text-xs uppercase tracking-wider select-none shrink-0 self-end rounded-none bg-background overflow-hidden">
            <button
              onClick={() => setAcademyTab('matrix')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all cursor-pointer btn-press font-bold ${
                academyTab === 'matrix' ? 'bg-primary text-on-primary font-bold' : 'text-primary hover:bg-neutral-bg/50'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Studio Notepad</span>
            </button>
            <button
              onClick={() => setAcademyTab('flashcards')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all border-l border-border cursor-pointer btn-press font-bold ${
                academyTab === 'flashcards' ? 'bg-primary text-on-primary font-bold' : 'text-primary hover:bg-neutral-bg/50'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Flashcard deck ({dueCards.length})</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      {academyTab === 'knowledge' ? (
        <KnowledgeBaseTab
          knowledgeItems={knowledgeItems}
          addKnowledgeItem={addKnowledgeItem}
          deleteKnowledgeItem={deleteKnowledgeItem}
          inboxItems={inboxItems}
          updateInboxItemStatus={updateInboxItemStatus}
          dailyDigests={dailyDigests}
          courses={courses}
          courseModules={courseModules}
          addFlashcard={addFlashcard}
          showToast={showToast}
        />
      ) : !selectedCourseId ? (
        /* ==========================================
            VIEW 1: COURSE & SKILL MATRIX LIST
           ========================================== */
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border text-xs focus:outline-none focus:border-primary font-sans rounded-none"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setResearchModalOpen(true)}
                className="btn-press flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 text-xs font-label font-bold border border-primary rounded-none"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI RESEARCH</span>
              </button>
              <button
                onClick={() => setShowAddCourse(!showAddCourse)}
                className="btn-press flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none bg-surface border border-border text-primary hover:bg-neutral-bg/40 px-4 py-2 text-xs font-label font-bold rounded-none"
              >
                <Plus className="h-4 w-4" />
                <span>ADD COURSE</span>
              </button>
            </div>
          </div>

          {showAddCourse && (
            <form onSubmit={handleAddCourse} className="bg-surface border border-border p-6 rounded-none space-y-4 font-label text-xs shadow-none">
              <span className="block font-bold text-sm uppercase text-primary border-b border-border pb-2">
                Configure New Skill Matrix
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase text-secondary font-bold">Course / Matrix Title</label>
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. History of Modern Architecture"
                    required
                    className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase text-secondary font-bold">Category (Skill Class)</label>
                  <input
                    type="text"
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="e.g. Design, Philosophy, Technology"
                    className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase text-secondary font-bold">Skill Roadmap Summary</label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <PrimaryButton type="submit" className="flex-1">
                  Save Skill Matrix
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setShowAddCourse(false)}>
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          )}

          {courses.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-border rounded-none shadow-none">
              <BookOpen className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
              <h3 className="font-serif text-lg font-bold text-primary mb-2 uppercase">No skill matrices yet</h3>
              <p className="font-sans text-xs text-secondary max-w-sm mx-auto mb-6">
                Create a skill matrix to start organizing your courses, modules, lessons, and flashcards.
              </p>
              <button
                onClick={() => setShowAddCourse(true)}
                className="bg-primary text-on-primary px-5 py-2.5 uppercase text-xs tracking-wider font-bold cursor-pointer hover:bg-primary/90 transition-all rounded-none border border-primary btn-press"
              >
                Create one to begin
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {courses
                  .filter(c => 
                    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((course) => {
                    const progress = calculateCourseProgress(course.id);
                    const modules = courseModules.filter((m) => m.course_id === course.id);
                    const courseLessons = lessons.filter((lesson) => modules.some((module) => module.id === lesson.module_id));
                    const courseDueCards = flashcards.filter((card) => card.course_id === course.id && new Date(card.next_review_date) <= new Date()).length;

                    return (
                      <div
                        key={course.id}
                        className="bg-surface border border-border p-4 md:p-5 flex flex-col justify-between space-y-4 rounded-none relative group hover:border-primary transition-all shadow-none"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 min-w-0">
                              <span className="inline-flex font-label text-[10px] bg-neutral-bg/60 border border-border px-1.5 py-0.5 text-primary uppercase tracking-wide font-bold">
                                {course.category}
                              </span>
                              <h4 className="font-serif text-lg font-bold text-primary tracking-tight leading-tight">
                                {course.title}
                              </h4>
                              {course.description && (
                                <p className="font-sans text-xs text-secondary leading-relaxed line-clamp-2">
                                  {course.description}
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setCourseToEdit(course);
                                  setEditCourseTitle(course.title);
                                  setEditCourseDesc(course.description || '');
                                  setEditCourseCategory(course.category || '');
                                  setEditCourseModalOpen(true);
                                }}
                                className="text-secondary hover:text-primary cursor-pointer btn-press"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({ id: course.id, title: course.title, type: 'course' });
                                  setDeleteModalOpen(true);
                                }}
                                className="text-secondary hover:text-tertiary cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="border border-border bg-background px-3 py-2">
                              <span className="block font-label text-[9px] uppercase tracking-[0.14em] text-secondary font-bold">Modules</span>
                              <span className="block mt-1 text-sm font-semibold text-primary">{modules.length}</span>
                            </div>
                            <div className="border border-border bg-background px-3 py-2">
                              <span className="block font-label text-[9px] uppercase tracking-[0.14em] text-secondary font-bold">Lessons</span>
                              <span className="block mt-1 text-sm font-semibold text-primary">{courseLessons.length}</span>
                            </div>
                            <div className="border border-border bg-background px-3 py-2">
                              <span className="block font-label text-[9px] uppercase tracking-[0.14em] text-secondary font-bold">Due</span>
                              <span className="block mt-1 text-sm font-semibold text-accent">{courseDueCards}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-border pt-3 space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="font-label text-[10px] text-secondary uppercase tracking-wider block font-bold">
                                Completion
                              </span>
                              <span className="font-serif text-base font-bold text-accent">
                                {progress}%
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedCourseId(course.id);
                                if (modules.length > 0) {
                                  setSelectedModuleId(modules[0].id);
                                }
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="border border-primary bg-primary text-on-primary hover:bg-primary/95 transition-all px-3 py-2 font-label text-xs uppercase tracking-widest font-bold cursor-pointer btn-press rounded-none"
                            >
                              Open Studio
                            </button>
                          </div>

                          <div className="w-full bg-border h-1.5 rounded-none overflow-hidden">
                            <div 
                              className="bg-accent h-full transition-all duration-500 ease-out rounded-none"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : academyTab === 'matrix' ? (
        /* ==========================================
            VIEW 2: SPLIT-SCREEN STUDY STUDIO
           ========================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border border-border bg-surface p-4 min-h-[92px] flex flex-col justify-between">
              <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Modules</span>
              <span className="text-2xl font-bold text-primary">{activeCourseModules.length}</span>
            </div>
            <div className="border border-border bg-surface p-4 min-h-[92px] flex flex-col justify-between">
              <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Lessons Done</span>
              <span className="text-2xl font-bold text-primary">{completedActiveLessons}/{activeCourseLessons.length}</span>
            </div>
            <div className="border border-border bg-surface p-4 min-h-[92px] flex flex-col justify-between">
              <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Reader Time</span>
              <span className="text-2xl font-bold text-primary">{estimatedReadMinutes} min</span>
            </div>
            <div className="border border-border bg-surface p-4 min-h-[92px] flex flex-col justify-between">
              <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Cards</span>
              <span className="text-2xl font-bold text-accent">{activeCourseCards.length}</span>
            </div>
          </div>

          <div className="flex lg:hidden border border-border font-label text-xs rounded-none bg-background overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileStudioTab('index')}
              className={`flex-1 text-center py-2 uppercase tracking-wider font-bold cursor-pointer btn-press ${
                mobileStudioTab === 'index' ? 'bg-primary text-on-primary font-bold' : 'text-primary bg-surface hover:bg-neutral-bg/50'
              }`}
            >
              Outline
            </button>
            <button
              type="button"
              onClick={() => setMobileStudioTab('notepad')}
              className={`flex-1 text-center py-2 uppercase tracking-wider font-bold cursor-pointer border-l border-border btn-press ${
                mobileStudioTab === 'notepad' ? 'bg-primary text-on-primary font-bold' : 'text-primary bg-surface hover:bg-neutral-bg/50'
              }`}
            >
              Notes
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
            <section className={`space-y-4 ${mobileStudioTab !== 'index' ? 'hidden lg:block' : ''}`}>
              <div className="border border-border bg-surface p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1 min-w-0">
                    <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Course Overview</span>
                    <h3 className="font-display text-xl font-bold text-primary">{activeCourse?.title}</h3>
                    {activeCourse?.description && (
                      <p className="text-sm text-secondary leading-relaxed">{activeCourse.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setNewModuleModalOpen(true)}
                    className="bg-primary text-on-primary text-[10px] font-bold px-2.5 py-2 uppercase tracking-wider rounded-none cursor-pointer hover:bg-opacity-90 btn-press flex items-center justify-center space-x-1 border border-primary shrink-0 self-start lg:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Module</span>
                  </button>
                </div>

                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary" />
                  <input
                    type="text"
                    placeholder="Search modules or lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-none text-xs focus:outline-none focus:border-primary font-sans"
                  />
                </div>
              </div>

              <div className="border border-border bg-surface overflow-visible lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto">
                <div className="p-4 space-y-4">
                  {activeCourseModules
                    .filter((mod) => {
                      const titleMatch = mod.title.toLowerCase().includes(searchQuery.toLowerCase());
                      const hasMatchingLesson = lessons.some(
                        (lesson) => lesson.module_id === mod.id && lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      return titleMatch || hasMatchingLesson;
                    })
                    .map((mod) => {
                      const modLessons = lessons
                        .filter((lesson) => lesson.module_id === mod.id)
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .filter((lesson) =>
                          lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          mod.title.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      const isSelected = selectedModuleId === mod.id;
                      const completedCount = modLessons.filter((lesson) => lesson.completed).length;

                      return (
                        <div
                          key={mod.id}
                          className={`border p-4 space-y-3 transition-all ${isSelected ? 'border-primary bg-background' : 'border-border bg-surface'}`}
                        >
                          <div className="flex justify-between items-start gap-3 group/mod">
                            {editingModuleId === mod.id ? (
                              <div className="flex-grow flex gap-2">
                                <input
                                  type="text"
                                  value={editModuleName}
                                  onChange={(e) => setEditModuleName(e.target.value)}
                                  className="flex-grow bg-surface border border-border px-2 py-1 font-sans text-sm text-primary focus:outline-none rounded-none"
                                />
                                <button
                                  onClick={async () => {
                                    if (!editModuleName.trim()) return;
                                    await updateModule(mod.id, { title: editModuleName });
                                    setEditingModuleId(null);
                                    showToast('Module title updated.', 'success');
                                  }}
                                  className="bg-primary text-on-primary px-2 py-1 text-[10px] uppercase font-bold rounded-none cursor-pointer btn-press border border-primary"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedModuleId(mod.id);
                                    setMobileStudioTab('notepad');
                                  }}
                                  className="text-left min-w-0"
                                >
                                  <span className="block font-label text-[10px] uppercase tracking-[0.14em] text-secondary font-bold">
                                    Module {mod.order_index}
                                  </span>
                                  <h4 className="font-serif text-base font-bold text-primary leading-tight mt-1">{mod.title}</h4>
                                </button>
                                <div className="hidden group-hover/mod:flex items-center space-x-1 opacity-70 transition-opacity shrink-0">
                                  <button onClick={() => { setEditingModuleId(mod.id); setEditModuleName(mod.title); }} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><Edit3 className="h-3 w-3" /></button>
                                  <button onClick={() => { setItemToDelete({ id: mod.id, title: mod.title, type: 'module' }); setDeleteModalOpen(true); }} className="text-secondary hover:text-accent p-0.5 cursor-pointer btn-press"><Trash2 className="h-3 w-3" /></button>
                                  <button onClick={() => handleReorderModule(mod.id, 'up')} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><ArrowUp className="h-3 w-3" /></button>
                                  <button onClick={() => handleReorderModule(mod.id, 'down')} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><ArrowDown className="h-3 w-3" /></button>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-secondary">
                            <span>{completedCount}/{modLessons.length} lessons complete</span>
                            {isSelected && <span className="font-label uppercase tracking-[0.14em] text-primary font-bold">Open</span>}
                          </div>

                          <div className="space-y-2">
                            {modLessons.map((lesson) => (
                              <div key={lesson.id} className="flex items-center justify-between gap-2 p-2 bg-background border border-border group/les">
                                {editingLessonId === lesson.id ? (
                                  <div className="flex-grow flex flex-col gap-1.5 font-label text-xs w-full">
                                    <input
                                      type="text"
                                      value={editLessonName}
                                      onChange={(e) => setEditLessonName(e.target.value)}
                                      className="w-full bg-surface border border-border px-2 py-1 focus:outline-none rounded-none font-sans"
                                      placeholder="Lesson title"
                                    />
                                    <input
                                      type="text"
                                      value={editLessonLink}
                                      onChange={(e) => setEditLessonLink(e.target.value)}
                                      className="w-full bg-surface border border-border px-2 py-1 focus:outline-none rounded-none font-sans"
                                      placeholder="Link (optional)"
                                    />
                                    <div className="flex gap-1.5 justify-end mt-1">
                                      <button
                                        onClick={async () => {
                                          if (!editLessonName.trim()) return;
                                          const { isValid, formatted } = formatAndValidateUrl(editLessonLink);
                                          if (!isValid) {
                                            showToast('Please enter a valid URL', 'error');
                                            return;
                                          }
                                          await updateLesson(lesson.id, { title: editLessonName, link: formatted || undefined });
                                          setEditingLessonId(null);
                                          showToast('Lesson updated.', 'success');
                                        }}
                                        className="bg-primary text-on-primary px-2 py-0.5 text-[10px] uppercase font-bold rounded-none cursor-pointer btn-press border border-primary"
                                      >
                                        Save
                                      </button>
                                      <button onClick={() => setEditingLessonId(null)} className="border border-border bg-surface hover:bg-neutral-bg px-2 py-0.5 text-[10px] uppercase rounded-none cursor-pointer btn-press">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={lesson.completed}
                                        onChange={() => toggleLessonCompleted(lesson.id, !lesson.completed)}
                                        className="h-4.5 w-4.5 accent-accent shrink-0 cursor-pointer"
                                      />
                                      <span className={`font-sans text-xs truncate font-semibold ${lesson.completed ? 'line-through text-secondary opacity-65' : 'text-primary'}`}>
                                        {lesson.title}
                                      </span>
                                    </label>
                                    <div className="flex items-center space-x-2 shrink-0">
                                      {lesson.link && (
                                        <a href={lesson.link} target="_blank" rel="noreferrer" className="text-secondary hover:text-accent btn-press">
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                      <div className="hidden group-hover/les:flex items-center space-x-1 opacity-70 transition-opacity">
                                        <button onClick={() => { setEditingLessonId(lesson.id); setEditLessonName(lesson.title); setEditLessonLink(lesson.link || ''); }} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><Edit3 className="h-3 w-3" /></button>
                                        <button onClick={() => { setItemToDelete({ id: lesson.id, title: lesson.title, type: 'lesson' }); setDeleteModalOpen(true); }} className="text-secondary hover:text-accent p-0.5 cursor-pointer btn-press"><Trash2 className="h-3 w-3" /></button>
                                        <button onClick={() => handleReorderLesson(lesson.id, 'up')} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><ArrowUp className="h-3 w-3" /></button>
                                        <button onClick={() => handleReorderLesson(lesson.id, 'down')} className="text-secondary hover:text-primary p-0.5 cursor-pointer btn-press"><ArrowDown className="h-3 w-3" /></button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          {isSelected && (
                            <div className="pt-3 border-t border-border space-y-2 font-label text-xs">
                              <input
                                type="text"
                                value={newLessonName}
                                onChange={(e) => setNewLessonName(e.target.value)}
                                placeholder="Add lesson title..."
                                className="w-full bg-background border border-border px-2 py-2 text-xs focus:outline-none rounded-none font-sans"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newLessonLink}
                                  onChange={(e) => setNewLessonLink(e.target.value)}
                                  placeholder="Link (optional)..."
                                  className="flex-grow bg-background border border-border px-2 py-2 text-xs focus:outline-none rounded-none font-sans"
                                />
                                <button
                                  onClick={() => handleAddLesson(mod.id)}
                                  className="bg-primary text-on-primary px-4 py-2 font-bold uppercase tracking-wider cursor-pointer rounded-none shrink-0 btn-press border border-primary"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </section>

            <section className={`space-y-4 ${mobileStudioTab !== 'notepad' ? 'hidden lg:block' : ''}`}>
              {activeModule ? (
                <>
                  <div className="border border-border bg-surface p-5 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 min-w-0">
                        <span className="font-label text-[10px] text-secondary uppercase tracking-[0.16em] font-bold">Study Studio</span>
                        <h3 className="font-display text-xl font-bold text-primary">{activeModule.title}</h3>
                        <div className="flex flex-wrap gap-2 text-[11px] text-secondary">
                          <span className="border border-border bg-background px-2 py-1">{noteWordCount} words</span>
                          <span className="border border-border bg-background px-2 py-1">{estimatedReadMinutes} min read</span>
                          <span className="border border-border bg-background px-2 py-1">{noteHeadings.length} sections</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="relative">
                          <button
                            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                            className="p-2 border border-border bg-surface hover:bg-neutral-bg/40 transition-all text-primary flex items-center justify-center cursor-pointer rounded-none btn-press"
                            title="Version History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {showHistoryDropdown && (
                            <div className="absolute right-0 mt-1 w-64 bg-surface border border-border shadow-none rounded-none z-50 text-[11px] max-h-48 overflow-y-auto">
                              <span className="block p-2 font-bold border-b border-border bg-neutral-bg uppercase text-[10px]">Notes Version History</span>
                              {notesHistory.length === 0 ? (
                                <p className="p-3 text-center text-secondary italic">No saved history yet</p>
                              ) : (
                                notesHistory.map((historyItem: any, hIdx: number) => (
                                  <button
                                    key={hIdx}
                                    onClick={() => {
                                      setLocalNotes(historyItem.notes);
                                      setShowHistoryDropdown(false);
                                      showToast('Notes restored to historical version.', 'info');
                                    }}
                                    className="w-full text-left p-2 border-b border-border hover:bg-neutral-bg flex flex-col justify-start btn-press"
                                  >
                                    <span className="font-bold text-primary">{hIdx === 0 ? 'Current Session' : `Version ${notesHistory.length - hIdx}`}</span>
                                    <span className="text-[9px] text-secondary">{new Date(historyItem.timestamp).toLocaleString()}</span>
                                    <span className="text-[9px] text-secondary truncate w-full mt-0.5">{historyItem.notes.slice(0, 40) || '(empty)'}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex border border-border font-label text-xs rounded-none overflow-hidden bg-background">
                          <button onClick={() => setIsNotePreview(false)} className={`px-3 py-2 flex items-center space-x-1 cursor-pointer btn-press font-bold ${!isNotePreview ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/50'}`}><Edit3 className="h-3 w-3" /><span>Edit</span></button>
                          <button onClick={() => setIsNotePreview(true)} className={`px-3 py-2 flex items-center space-x-1 border-l border-border cursor-pointer btn-press font-bold ${isNotePreview ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/50'}`}><Eye className="h-3 w-3" /><span>Preview</span></button>
                        </div>

                        <button
                          onClick={() => {
                            setIsNotePreview(true);
                            setIsReaderOpen(true);
                          }}
                          className="border border-border bg-surface px-3 py-2 text-xs font-label uppercase font-bold tracking-[0.16em] text-primary hover:bg-neutral-bg/40 btn-press flex items-center gap-2"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          <span>Reader</span>
                        </button>
                      </div>
                    </div>

                    {(previousModule || nextModule) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!previousModule}
                          onClick={() => previousModule && setSelectedModuleId(previousModule.id)}
                          className="border border-border bg-background px-3 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-all"
                        >
                          <span className="font-label text-[10px] uppercase tracking-[0.14em] text-secondary font-bold flex items-center gap-1"><ChevronLeft className="h-3 w-3" />Previous</span>
                          <span className="block mt-1 text-sm font-semibold text-primary truncate">{previousModule?.title || 'Start of course'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={!nextModule}
                          onClick={() => nextModule && setSelectedModuleId(nextModule.id)}
                          className="border border-border bg-background px-3 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-all"
                        >
                          <span className="font-label text-[10px] uppercase tracking-[0.14em] text-secondary font-bold flex items-center justify-end gap-1">Next<ChevronRight className="h-3 w-3" /></span>
                          <span className="block mt-1 text-sm font-semibold text-primary truncate text-left">{nextModule?.title || 'End of course'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {noteHeadings.length > 0 && (
                    <div className="border border-border bg-surface p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <List className="h-4 w-4 text-secondary" />
                        <span className="font-label text-[10px] uppercase tracking-[0.16em] text-secondary font-bold">Section Guide</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {noteHeadings.slice(0, 8).map((heading, index) => (
                          <button
                            key={`${heading.title}-${index}`}
                            type="button"
                            onClick={() => {
                              setIsNotePreview(true);
                              setIsReaderOpen(true);
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  const target = document.getElementById(getHeadingId(heading.title));
                                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                });
                              });
                            }}
                            className="border border-border bg-background px-2.5 py-1.5 text-xs text-primary hover:border-primary btn-press"
                          >
                            {heading.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border border-border bg-surface p-5 min-h-[560px] flex flex-col">
                    <div className="flex-grow mt-1 flex flex-col">
                      {!isNotePreview ? (
                        <textarea
                          value={localNotes}
                          onChange={(e) => setLocalNotes(e.target.value)}
                          placeholder="# Markdown Notes here&#10;- Bullet point one&#10;- Bullet point two&#10;> An architectural quote"
                          className="w-full flex-grow min-h-[420px] bg-neutral-bg/45 border border-border px-4 py-4 text-sm text-primary focus:outline-none font-mono resize-none leading-relaxed rounded-none"
                        />
                      ) : (
                        <div className="w-full flex-grow min-h-[420px] bg-background border border-border px-4 py-4 overflow-y-auto rounded-none">
                          {renderMarkdown(localNotes)}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-3 mt-4 flex flex-col sm:flex-row justify-between gap-2 text-xs font-label text-secondary font-bold">
                      <span>{isSavingNotes ? 'Saving...' : 'Notes auto-saved to backend'}</span>
                      <span className="font-mono text-secondary/65 font-normal">Markdown syntax supported</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-24 border border-border bg-surface">
                  <BookOpen className="h-10 w-10 text-secondary/40 mx-auto mb-2" />
                  <p className="font-sans text-xs text-secondary italic">No active module selected. Select a module from the outline.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        /* ==========================================
            VIEW 3: SPACED REPETITION (SRS) FLASHCARDS
           ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Flashcard Study Desk (Deck queue viewer) */}
          <section className="lg:col-span-2 bg-surface border border-border p-6 rounded-none flex flex-col justify-between min-h-[400px] shadow-none">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-border pb-2">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block font-bold">
                  Leitner Review Station ({dueCards.length} cards due)
                </span>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-secondary" />
                  <input
                    type="text"
                    placeholder="Search deck..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 bg-neutral-bg/50 border border-border rounded-none text-[10px] focus:outline-none focus:border-primary font-sans"
                  />
                </div>
              </div>

              {activeCard ? (
                <div className="space-y-8 flex flex-col items-center py-8">
                  {/* Flip Card Container */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full max-w-md h-48 cursor-pointer select-none"
                    style={{ perspective: '1000px' }}
                  >
                    <div
                      className="relative w-full h-full text-center transition-transform duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Front Side */}
                      <div
                        className="absolute inset-0 w-full h-full border border-border bg-neutral-bg flex flex-col justify-center p-6 rounded-none shadow-none"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden'
                        }}
                      >
                        <span className="absolute top-3 left-3 font-label text-[9px] text-secondary uppercase font-bold">
                          Box {activeCard.box} &bull; Question
                        </span>
                        <p className="font-serif text-sm text-center text-primary leading-relaxed font-bold px-4">
                          {activeCard.front}
                        </p>
                        <span className="absolute bottom-3 right-3 font-label text-[9px] text-secondary uppercase tracking-wider font-bold">
                          Click Card to Flip
                        </span>
                      </div>

                      {/* Back Side */}
                      <div
                        className="absolute inset-0 w-full h-full border border-border bg-neutral-bg flex flex-col justify-center p-6 rounded-none shadow-none"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <span className="absolute top-3 left-3 font-label text-[9px] text-secondary uppercase font-bold">
                          Box {activeCard.box} &bull; Answer
                        </span>
                        <p className="font-serif text-sm text-center text-primary leading-relaxed font-bold px-4">
                          {activeCard.back}
                        </p>
                        <span className="absolute bottom-3 right-3 font-label text-[9px] text-secondary uppercase tracking-wider font-bold">
                          Click Card to Flip
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isFlipped && (
                    <div className="flex space-x-4 w-full max-w-sm font-label text-xs">
                      <button
                        onClick={async () => {
                          const nextDue = dueCards.filter(fc => fc.id !== activeCard.id);
                          await reviewFlashcard(activeCard.id, true);
                          setIsFlipped(false);
                          if (nextDue.length > 0) {
                            setActiveFlashcardIndex(Math.max(0, Math.min(activeFlashcardIndex, nextDue.length - 1)));
                          } else {
                            setActiveFlashcardIndex(0);
                          }
                          showToast('Marked correct!', 'success');
                        }}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 border border-emerald-800 text-white py-2 uppercase font-bold tracking-wider rounded-none cursor-pointer btn-press"
                      >
                        Correct (Box +1)
                      </button>
                      <button
                        onClick={async () => {
                          const nextDue = dueCards.filter(fc => fc.id !== activeCard.id);
                          await reviewFlashcard(activeCard.id, false);
                          setIsFlipped(false);
                          if (nextDue.length > 0) {
                            setActiveFlashcardIndex(Math.max(0, Math.min(activeFlashcardIndex, nextDue.length - 1)));
                          } else {
                            setActiveFlashcardIndex(0);
                          }
                          showToast('Marked incorrect.', 'error');
                        }}
                        className="flex-1 bg-accent hover:bg-accent/90 text-on-primary py-2 uppercase font-bold tracking-wider rounded-none cursor-pointer btn-press"
                      >
                        Incorrect (Box 1)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24">
                  <span className="font-serif text-md italic text-secondary block">No cards due for review.</span>
                  <span className="font-sans text-xs text-secondary mt-1 block">Leitner box intervals satisfied. Add flashcards below.</span>
                </div>
              )}
            </div>

            {/* Deck queue list footer */}
            {dueCards.length > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-border font-label text-xs font-bold">
                <button
                  disabled={activeFlashcardIndex === 0}
                  onClick={() => { setActiveFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
                  className="text-secondary disabled:opacity-30 uppercase cursor-pointer btn-press hover:text-accent"
                >
                  &larr; Prev Card
                </button>
                <span className="text-secondary">Card {activeFlashcardIndex + 1} of {dueCards.length}</span>
                <button
                  disabled={activeFlashcardIndex === dueCards.length - 1}
                  onClick={() => { setActiveFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
                  className="text-secondary disabled:opacity-30 uppercase cursor-pointer btn-press hover:text-accent"
                >
                  Next Card &rarr;
                </button>
              </div>
            )}
          </section>

          {/* Flashcard Side Panel: Stats + Single Add / Bulk Import */}
          <div className="space-y-6">
            
            {/* Statistics */}
            <section className="bg-surface border border-border p-5 rounded-none space-y-4 font-label text-xs shadow-none">
              <span className="block text-xs uppercase text-secondary font-bold border-b border-border pb-1">
                Deck Statistics
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-bg p-2.5 border border-border rounded-none">
                  <span className="block text-[9px] text-secondary uppercase font-bold">Total Cards</span>
                  <span className="text-md font-bold font-serif text-primary">{totalCards}</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-border rounded-none">
                  <span className="block text-[9px] text-secondary uppercase font-bold">Mastery Rate</span>
                  <span className="text-md font-bold font-serif text-accent">{masteryRate}%</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-border rounded-none">
                  <span className="block text-[9px] text-secondary uppercase font-bold">Accuracy Rate</span>
                  <span className="text-md font-bold font-serif text-emerald-800">{totalReviews > 0 ? `${accuracyRate}%` : '0%'}</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-border rounded-none">
                  <span className="block text-[9px] text-secondary uppercase font-bold">Total Reviews</span>
                  <span className="text-md font-bold font-serif text-primary">{totalReviews}</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <span className="block text-[10px] text-secondary uppercase font-bold">Leitner Box Distribution</span>
                <div className="flex items-center space-x-1">
                  {boxCounts.map((count, i) => {
                    const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
                    return (
                      <div key={i} className="flex-grow flex flex-col items-center">
                        <div className="w-full bg-neutral-bg h-12 rounded-none relative border border-border flex items-end">
                          <div 
                            className="w-full bg-accent/80 rounded-none transition-all duration-300"
                            style={{ height: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[9px] text-primary">
                            {count}
                          </span>
                        </div>
                        <span className="text-[9px] text-secondary uppercase mt-1 font-bold">B{i+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Flashcard Add Panel */}
            <section className="bg-surface border border-border p-6 rounded-none shadow-none">
              <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] font-bold">
                  {isBulkImport ? 'Bulk Import' : 'Add Flashcard'}
                </span>
                <button
                  onClick={() => setIsBulkImport(!isBulkImport)}
                  className="text-secondary hover:text-accent text-[10px] uppercase font-bold flex items-center space-x-1 cursor-pointer btn-press"
                >
                  <Upload className="h-3 w-3" />
                  <span>{isBulkImport ? 'Single' : 'Bulk'}</span>
                </button>
              </div>

              {!isBulkImport ? (
                <form onSubmit={handleAddFlashcardSubmit} className="space-y-4 font-label text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Module Source</label>
                    <select
                      value={fcModuleId}
                      onChange={(e) => setFcModuleId(e.target.value)}
                      required
                      className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
                    >
                      <option value="">-- Choose Module --</option>
                      {courseModules
                        .filter((m) => m.course_id === selectedCourseId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Front Question</label>
                    <textarea
                      value={fcQuestion}
                      onChange={(e) => setFcQuestion(e.target.value)}
                      rows={2}
                      placeholder="e.g. What is a Service Worker lifecycle?"
                      required
                      className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-sans rounded-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Back Answer</label>
                    <textarea
                      value={fcAnswer}
                      onChange={(e) => setFcAnswer(e.target.value)}
                      rows={2}
                      placeholder="e.g. Install, Activate, Idle, Fetch"
                      required
                      className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-sans rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!fcModuleId || !fcQuestion || !fcAnswer}
                    className="w-full border border-primary bg-primary text-on-primary hover:bg-primary/95 py-2 uppercase text-xs tracking-wider font-bold mt-2 cursor-pointer rounded-none disabled:opacity-50 btn-press"
                  >
                    SAVE FLASHCARD
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBulkImportSubmit} className="space-y-4 font-label text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Module Source</label>
                    <select
                      value={fcModuleId}
                      onChange={(e) => setFcModuleId(e.target.value)}
                      required
                      className="w-full bg-neutral-bg border border-border px-2 py-1.5 focus:outline-none font-sans rounded-none"
                    >
                      <option value="">-- Choose Module --</option>
                      {courseModules
                        .filter((m) => m.course_id === selectedCourseId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary font-bold">Paste CSV or TSV (one card per line)</label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={6}
                      placeholder="Question 1, Answer 1&#10;Question 2, Answer 2&#10;Or use tab-separation from spreadsheet"
                      required
                      className="w-full bg-neutral-bg border border-border px-3 py-1.5 focus:outline-none font-mono rounded-none"
                    />
                    <p className="text-[9px] text-secondary mt-1 font-sans">Format: Front / Question, Back / Answer</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!fcModuleId || !bulkText.trim()}
                    className="w-full border border-primary bg-primary text-on-primary hover:bg-primary/95 py-2 uppercase text-xs tracking-wider font-bold mt-2 cursor-pointer rounded-none disabled:opacity-50 btn-press"
                  >
                    IMPORT FLASHCARDS
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* Flashcard list footer directory */}
          {courseCards.length > 0 && (
            <section className="lg:col-span-3 bg-surface border border-border p-6 rounded-none space-y-4 shadow-none">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block border-b border-border pb-1 font-bold">
                Deck Cards Directory ({courseCards.length} cards)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-label">
                  <thead>
                    <tr className="border-b border-border text-secondary uppercase font-bold">
                      <th className="py-2 font-bold">Front (Question)</th>
                      <th className="py-2 font-bold">Back (Answer)</th>
                      <th className="py-2 font-bold text-center">Box</th>
                      <th className="py-2 font-bold text-center">Reviews (Acc)</th>
                      <th className="py-2 font-bold">Next Review</th>
                      <th className="py-2 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {courseCards.map(fc => (
                      <tr key={fc.id} className="hover:bg-neutral-bg/30">
                        <td className="py-2.5 pr-4 truncate max-w-xs">{fc.front}</td>
                        <td className="py-2.5 pr-4 truncate max-w-xs">{fc.back}</td>
                        <td className="py-2.5 font-mono text-center">{fc.box}</td>
                        <td className="py-2.5 font-mono text-center">
                          {fc.total_reviews ? `${fc.correct_reviews}/${fc.total_reviews} (${Math.round(((fc.correct_reviews || 0) / fc.total_reviews) * 100)}%)` : '-'}
                        </td>
                        <td className="py-2.5 font-mono text-[10px]">
                          {new Date(fc.next_review_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setItemToDelete({ id: fc.id, title: fc.front, type: 'flashcard' });
                              setDeleteModalOpen(true);
                            }}
                            className="text-secondary hover:text-accent cursor-pointer btn-press"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}

      {isReaderOpen && activeModule && (
        <div className="fixed inset-0 z-[120] h-dvh bg-background">
          <div className="flex h-full flex-col">
            <div className="border-b border-border bg-surface/95 backdrop-blur px-3 py-2 md:px-4">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-bold text-primary md:text-base">{activeModule.title}</h3>
                  <p className="mt-0.5 text-[11px] text-secondary">{noteWordCount} words • {estimatedReadMinutes} min</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => setReaderFontSize((value) => Math.max(14, value - 1))} className="border border-border bg-background p-2 text-primary hover:bg-neutral-bg/40 btn-press" aria-label="Decrease font size">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[46px] text-center text-xs font-semibold text-primary">{readerFontSize}px</span>
                  <button type="button" onClick={() => setReaderFontSize((value) => Math.min(24, value + 1))} className="border border-border bg-background p-2 text-primary hover:bg-neutral-bg/40 btn-press" aria-label="Increase font size">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotePreview((value) => !value)}
                    className="border border-border bg-background px-2.5 py-2 text-primary hover:bg-neutral-bg/40 btn-press"
                    aria-label={isNotePreview ? 'Edit notes' : 'Preview notes'}
                  >
                    <Type className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReaderSettings((value) => !value)}
                    className={`border border-border px-2.5 py-2 text-primary btn-press ${showReaderSettings ? 'bg-primary text-on-primary' : 'bg-background hover:bg-neutral-bg/40'}`}
                    aria-label="Reader settings"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReaderSettings(false);
                      setIsReaderOpen(false);
                    }}
                    className="border border-border bg-background p-2 text-primary hover:bg-neutral-bg/40 btn-press"
                    aria-label="Exit reader"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showReaderSettings && (
                <div className="mt-2 border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex border border-border bg-surface overflow-hidden">
                      <button type="button" onClick={() => setReaderLineHeight('relaxed')} className={`px-3 py-1.5 text-[10px] font-label uppercase font-bold ${readerLineHeight === 'relaxed' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/40'}`}>Tight</button>
                      <button type="button" onClick={() => setReaderLineHeight('loose')} className={`px-3 py-1.5 text-[10px] font-label uppercase font-bold border-l border-border ${readerLineHeight === 'loose' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/40'}`}>Open</button>
                    </div>

                    <div className="flex border border-border bg-surface overflow-hidden">
                      <button type="button" onClick={() => setReaderWidth('focused')} className={`px-3 py-1.5 text-[10px] font-label uppercase font-bold ${readerWidth === 'focused' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/40'}`}>Focused</button>
                      <button type="button" onClick={() => setReaderWidth('wide')} className={`px-3 py-1.5 text-[10px] font-label uppercase font-bold border-l border-border ${readerWidth === 'wide' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg/40'}`}>Wide</button>
                    </div>
                  </div>

                  {noteHeadings.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {noteHeadings.map((heading, index) => (
                        <button
                          key={`${heading.title}-${index}`}
                          type="button"
                          onClick={() => {
                            const target = document.getElementById(getHeadingId(heading.title));
                            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setShowReaderSettings(false);
                          }}
                          className="border border-border bg-surface px-2 py-1.5 text-[11px] text-primary whitespace-nowrap hover:border-primary btn-press"
                        >
                          {heading.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div ref={readerViewportRef} className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4">
              <div className={`mx-auto ${readerWidth === 'focused' ? 'max-w-2xl' : 'max-w-4xl'}`}>
                {!isNotePreview ? (
                  <textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="# Markdown Notes here&#10;- Bullet point one&#10;- Bullet point two&#10;> An architectural quote"
                    className="w-full min-h-[calc(100dvh-5.5rem)] bg-surface border border-border px-4 py-4 text-primary focus:outline-none font-mono resize-none rounded-none"
                    style={{ fontSize: `${Math.max(14, readerFontSize - 1)}px`, lineHeight: readerLineHeight === 'loose' ? 1.9 : 1.65 }}
                  />
                ) : (
                  <div
                    className="bg-surface border border-border px-4 py-4 md:px-8 md:py-7"
                    style={{ fontSize: `${readerFontSize}px`, lineHeight: readerLineHeight === 'loose' ? 1.9 : 1.65 }}
                  >
                    {renderMarkdown(localNotes, {
                      paragraphClassName: 'text-[1em] leading-[inherit] my-3',
                      heading1ClassName: 'text-[1.6em] mt-6',
                      heading2ClassName: 'text-[1.3em] mt-5',
                      heading3ClassName: 'text-[1.05em] mt-4 uppercase tracking-[0.08em]',
                      listClassName: 'text-[1em] leading-[inherit] my-3 space-y-2',
                      blockquoteClassName: 'text-[0.95em] py-3 px-4',
                      codeBlockClassName: 'text-[0.82em] leading-relaxed',
                      tableClassName: 'text-[0.88em]',
                      emptyClassName: 'italic text-secondary'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourseModalOpen && courseToEdit && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border p-6 rounded-none w-full max-w-lg space-y-4 font-label text-xs shadow-none">
            <span className="block font-bold text-sm uppercase text-primary border-b border-border pb-2">
              Edit Skill Matrix
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary font-bold">Course / Matrix Title</label>
                <input
                  type="text"
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary font-bold">Category (Skill Class)</label>
                <input
                  type="text"
                  value={editCourseCategory}
                  onChange={(e) => setEditCourseCategory(e.target.value)}
                  className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary font-bold">Skill Roadmap Summary</label>
              <textarea
                value={editCourseDesc}
                onChange={(e) => setEditCourseDesc(e.target.value)}
                rows={3}
                className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans rounded-none"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <PrimaryButton
                onClick={async () => {
                  if (courseToEdit) {
                    await updateCourse(courseToEdit.id, {
                      title: editCourseTitle,
                      category: editCourseCategory,
                      description: editCourseDesc
                    });
                    showToast('Skill matrix updated successfully.', 'success');
                    setEditCourseModalOpen(false);
                    setCourseToEdit(null);
                  }
                }}
                className="flex-grow"
              >
                Save Changes
              </PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setEditCourseModalOpen(false);
                  setCourseToEdit(null);
                }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* New Module Modal */}
      {newModuleModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNewModuleModalOpen(false);
              setNewModuleName('');
            }
          }}
          className="fixed inset-0 bg-primary/25 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
        >
          <div className="bg-surface border border-border p-6 rounded-none w-full max-w-md space-y-4 font-label text-xs shadow-none">
            <span className="block font-bold text-sm uppercase text-primary border-b border-border pb-2">
              Create New Module
            </span>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newModuleName.trim()) return;
                if (selectedCourseId) {
                  await handleAddModule(selectedCourseId);
                  setNewModuleModalOpen(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary font-bold">Module Title</label>
                <input
                  type="text"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="e.g. Fundamental Concepts..."
                  required
                  className="w-full bg-neutral-bg border border-border px-2.5 py-1.5 focus:outline-none font-sans text-primary text-xs rounded-none"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <PrimaryButton
                  type="submit"
                  disabled={!newModuleName.trim()}
                  className="flex-grow"
                >
                  Create Module
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setNewModuleModalOpen(false);
                    setNewModuleName('');
                  }}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={async () => {
          if (itemToDelete) {
            if (itemToDelete.type === 'course') {
              await deleteCourse(itemToDelete.id);
              showToast('Skill matrix deleted successfully.', 'info');
            } else if (itemToDelete.type === 'module') {
              await deleteModule(itemToDelete.id);
              if (selectedModuleId === itemToDelete.id) {
                setSelectedModuleId(null);
              }
              showToast('Module deleted successfully.', 'info');
            } else if (itemToDelete.type === 'lesson') {
              await deleteLesson(itemToDelete.id);
              showToast('Lesson deleted successfully.', 'info');
            } else if (itemToDelete.type === 'flashcard') {
              await deleteFlashcard(itemToDelete.id);
              showToast('Flashcard deleted successfully.', 'info');
            }
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }
        }}
        itemName={itemToDelete?.title || ''}
        itemType={itemToDelete?.type === 'course' ? 'skill matrix' : itemToDelete?.type || ''}
      />

      <ResearchModal
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
        onComplete={(courseId) => {
          if (courseId) {
            setSelectedCourseId(courseId);
            setAcademyTab('matrix');
          }
        }}
        courses={courses}
      />

      {selectedCourseId && activeCourse && academyTab === 'matrix' && activeModule && (
        <QAPanel
          courseTitle={activeCourse.title}
          moduleTitle={activeModule.title}
          topic={activeCourse.title}
          moduleNotes={activeModule.notes || ''}
        />
      )}
    </PageShell>
  );
}

function KnowledgeBaseTab({
  knowledgeItems,
  addKnowledgeItem,
  deleteKnowledgeItem,
  inboxItems,
  updateInboxItemStatus,
  dailyDigests,
  courses,
  courseModules,
  addFlashcard,
  showToast
}: {
  knowledgeItems: any[];
  addKnowledgeItem: any;
  deleteKnowledgeItem: any;
  inboxItems: any[];
  updateInboxItemStatus: any;
  dailyDigests: any[];
  courses: any[];
  courseModules: any[];
  addFlashcard: any;
  showToast: any;
}) {
  // Add Note Form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteTopic, setNoteTopic] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSummary, setNoteSummary] = useState('');
  const [noteSourceUrl, setNoteSourceUrl] = useState('');

  // Add Flashcard state
  const [addingFcNoteId, setAddingFcNoteId] = useState<string | null>(null);
  const [fcQuestion, setFcQuestion] = useState('');
  const [fcAnswer, setFcAnswer] = useState('');
  const [fcCourseId, setFcCourseId] = useState('');
  const [fcModuleId, setFcModuleId] = useState('');

  // Search/Filter
  const [search, setSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Computations
  const filteredNotes = useMemo(() => {
    return knowledgeItems.filter(note => {
      const matchesSearch = !search || 
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        (note.topic && note.topic.toLowerCase().includes(search.toLowerCase())) ||
        (note.summary && note.summary.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [knowledgeItems, search]);

  const notesCreatedToday = useMemo(() => {
    return knowledgeItems.filter(note => note.created_at && note.created_at.split('T')[0] === todayStr);
  }, [knowledgeItems, todayStr]);

  // Unprocessed study resources from inbox
  const unprocessedResources = useMemo(() => {
    const studyTypes = ['resource', 'book_note', 'course_note', 'url', 'snippet'];
    return inboxItems.filter(item => {
      const isUnprocessed = item.status === 'unprocessed' || item.status === 'unsorted';
      return isUnprocessed && studyTypes.includes(item.type);
    });
  }, [inboxItems]);

  // Extract open questions from daily digests
  const openQuestions = useMemo(() => {
    const questionsList: { id: string; date: string; question: string }[] = [];
    dailyDigests.forEach((digest, dIdx) => {
      if (digest.questions && Array.isArray(digest.questions)) {
        digest.questions.forEach((q: string, qIdx: number) => {
          questionsList.push({
            id: `q-${dIdx}-${qIdx}`,
            date: digest.date,
            question: q
          });
        });
      }
    });
    return questionsList;
  }, [dailyDigests]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      showToast('Title and Content are required.', 'error');
      return;
    }
    try {
      await addKnowledgeItem(noteTitle, noteContent, noteTopic || 'General', noteSourceUrl || undefined, noteSummary || undefined);
      showToast('Knowledge note cataloged.', 'success');
      // Reset
      setNoteTitle('');
      setNoteTopic('');
      setNoteContent('');
      setNoteSummary('');
      setNoteSourceUrl('');
      setIsAddingNote(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to create knowledge note.', 'error');
    }
  };

  const handleConvertCapture = (item: any) => {
    setNoteTitle(item.title);
    setNoteTopic(item.type);
    setNoteContent(item.content || '');
    setNoteSourceUrl(item.source_url || '');
    setNoteSummary(`Captured from intake: ${item.title}`);
    setIsAddingNote(true);
    // Mark as processed immediately
    updateInboxItemStatus(item.id, 'processed');
    showToast('Capture loaded into note editor.', 'info');
  };

  const handleCreateFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcQuestion.trim() || !fcAnswer.trim() || !fcCourseId || !fcModuleId) {
      showToast('Please fill out all flashcard details.', 'error');
      return;
    }
    try {
      await addFlashcard(fcCourseId, fcModuleId, fcQuestion, fcAnswer);
      showToast('Flashcard created from knowledge note.', 'success');
      setAddingFcNoteId(null);
      setFcQuestion('');
      setFcAnswer('');
      setFcCourseId('');
      setFcModuleId('');
    } catch (err) {
      console.error(err);
      showToast('Failed to create flashcard.', 'error');
    }
  };

  const modulesForCourse = useMemo(() => {
    if (!fcCourseId) return [];
    return courseModules.filter(m => m.course_id === fcCourseId);
  }, [fcCourseId, courseModules]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Ledger Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-label text-[10px] uppercase font-bold text-primary">
        <div className="border border-border bg-surface p-4 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Total Notes</span>
          <span className="text-2xl font-bold mt-1">{knowledgeItems.length} items</span>
        </div>
        <div className="border border-border bg-surface p-4 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Created Today</span>
          <span className="text-2xl font-bold mt-1 text-accent">{notesCreatedToday.length} today</span>
        </div>
        <div className="border border-border bg-surface p-4 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Inbox Resources</span>
          <span className="text-2xl font-bold mt-1 text-primary">{unprocessedResources.length} wait</span>
        </div>
        <div className="border border-border bg-surface p-4 flex flex-col justify-between">
          <span className="text-secondary tracking-wider">Open Inquiries</span>
          <span className="text-2xl font-bold mt-1 text-primary">{openQuestions.length} open</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: LIBRARY & SEARCH */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b-2 border-primary pb-3">
            <h3 className="font-display text-lg font-bold text-primary uppercase tracking-wider">
              Knowledge Ledger
            </h3>
            <button
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="btn-press flex items-center space-x-1.5 cursor-pointer bg-primary text-on-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-label font-bold border border-primary rounded-none"
            >
              <Plus className="h-4 w-4" />
              <span>{isAddingNote ? 'Close Editor' : 'Catalog Note'}</span>
            </button>
          </div>

          {isAddingNote && (
            <form onSubmit={handleCreateNote} className="bg-surface border border-border p-6 rounded-none space-y-4 font-label text-xs shadow-none">
              <span className="block font-bold text-sm uppercase text-primary border-b border-border pb-2">
                Catalog Knowledge Note
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="noteTitle" className="block text-[10px] uppercase text-secondary font-bold">Title *</label>
                  <input
                    id="noteTitle"
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    required
                    placeholder="Key insight or concept..."
                    className="w-full bg-neutral-bg border border-border px-2.5 py-2 focus:outline-none font-sans rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="noteTopic" className="block text-[10px] uppercase text-secondary font-bold">Topic/Category</label>
                  <input
                    id="noteTopic"
                    type="text"
                    value={noteTopic}
                    onChange={(e) => setNoteTopic(e.target.value)}
                    placeholder="e.g. Systems Architecture, Finance..."
                    className="w-full bg-neutral-bg border border-border px-2.5 py-2 focus:outline-none font-sans rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="noteSourceUrl" className="block text-[10px] uppercase text-secondary font-bold">Source URL</label>
                  <input
                    id="noteSourceUrl"
                    type="text"
                    value={noteSourceUrl}
                    onChange={(e) => setNoteSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-bg border border-border px-2.5 py-2 focus:outline-none font-sans rounded-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="noteSummary" className="block text-[10px] uppercase text-secondary font-bold">Brief Summary</label>
                  <input
                    id="noteSummary"
                    type="text"
                    value={noteSummary}
                    onChange={(e) => setNoteSummary(e.target.value)}
                    placeholder="Core takeaway in 1 sentence..."
                    className="w-full bg-neutral-bg border border-border px-2.5 py-2 focus:outline-none font-sans rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="noteContent" className="block text-[10px] uppercase text-secondary font-bold">Detailed Content *</label>
                <textarea
                  id="noteContent"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                  rows={6}
                  placeholder="Explain the concept in detail, quotes, formulas..."
                  className="w-full bg-neutral-bg border border-border px-2.5 py-2 focus:outline-none font-sans rounded-none resize-none"
                />
              </div>

              <PrimaryButton type="submit" className="w-full">
                Catalog Note
              </PrimaryButton>
            </form>
          )}

          {/* Note List / Search */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary" />
              <input
                type="text"
                placeholder="Search ledger by title, summary, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border text-xs focus:outline-none focus:border-primary font-sans rounded-none"
              />
            </div>

            {filteredNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {filteredNotes.map((note) => {
                  const isAddingFc = addingFcNoteId === note.id;
                  return (
                    <div key={note.id} className="border border-border bg-surface p-4 flex flex-col justify-between space-y-4 rounded-none shadow-none">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-label text-[9px] uppercase font-bold text-accent">{note.topic || 'General'}</span>
                          <button
                            onClick={() => deleteKnowledgeItem(note.id)}
                            className="text-secondary hover:text-tertiary font-label text-[9px] uppercase font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                        <h4 className="font-display text-sm font-bold text-primary leading-tight">{note.title}</h4>
                        {note.summary && <p className="font-sans text-xs text-secondary leading-relaxed font-semibold italic">{note.summary}</p>}
                        <p className="font-sans text-xs text-primary leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        {note.source_url && (
                          <div className="pt-1">
                            <a
                              href={note.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-label text-[9px] uppercase font-bold text-secondary hover:text-primary flex items-center gap-1.5"
                            >
                              <span>View Source</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                        <span className="font-label text-[8px] text-secondary">Added {new Date(note.created_at).toLocaleDateString()}</span>
                        {!isAddingFc ? (
                          <button
                            onClick={() => {
                              setAddingFcNoteId(note.id);
                              setFcQuestion(`What is the core definition of "${note.title}"?`);
                              setFcAnswer(note.summary || note.content.slice(0, 100));
                            }}
                            className="font-label text-[9px] uppercase font-bold text-accent border border-accent/25 hover:border-accent px-2 py-0.5 bg-accent/5 rounded-none cursor-pointer"
                          >
                            Create Flashcard
                          </button>
                        ) : (
                          <button
                            onClick={() => setAddingFcNoteId(null)}
                            className="font-label text-[9px] uppercase font-bold text-secondary cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {/* Inline Create Flashcard form */}
                      {isAddingFc && (
                        <form onSubmit={handleCreateFlashcard} className="mt-3 p-3 bg-background border border-border space-y-3 font-label text-[10px]">
                          <span className="block font-bold text-[10px] uppercase text-primary border-b border-border/40 pb-1">
                            Add Leitner Flashcard
                          </span>
                          <div className="space-y-1.5">
                            <label className="block text-[9px] uppercase text-secondary font-bold">Front Question *</label>
                            <input
                              type="text"
                              value={fcQuestion}
                              onChange={(e) => setFcQuestion(e.target.value)}
                              required
                              className="w-full bg-surface border border-border px-2 py-1 text-xs font-sans rounded-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[9px] uppercase text-secondary font-bold">Back Answer *</label>
                            <textarea
                              value={fcAnswer}
                              onChange={(e) => setFcAnswer(e.target.value)}
                              required
                              rows={2}
                              className="w-full bg-surface border border-border px-2 py-1 text-xs font-sans rounded-none resize-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase text-secondary font-bold">Target Course *</label>
                              <select
                                value={fcCourseId}
                                onChange={(e) => {
                                  setFcCourseId(e.target.value);
                                  setFcModuleId('');
                                }}
                                required
                                className="w-full bg-surface border border-border px-1.5 py-1 text-xs font-sans rounded-none"
                              >
                                <option value="">Select Course...</option>
                                {courses.map(c => (
                                  <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[9px] uppercase text-secondary font-bold">Target Module *</label>
                              <select
                                value={fcModuleId}
                                onChange={(e) => setFcModuleId(e.target.value)}
                                required
                                disabled={!fcCourseId}
                                className="w-full bg-surface border border-border px-1.5 py-1 text-xs font-sans rounded-none"
                              >
                                <option value="">Select Module...</option>
                                {modulesForCourse.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <PrimaryButton type="submit" className="w-full py-1.5 text-[9px]">
                            Save Flashcard
                          </PrimaryButton>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border bg-surface/30">
                <p className="font-sans text-xs text-secondary italic">No knowledge notes found. Catalog some insights above.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RAW CAPTURES & INQUIRIES */}
        <div className="space-y-6 flex flex-col justify-start">
          {/* Unprocessed captures */}
          <div className="bg-surface border border-border p-5 space-y-4 rounded-none shadow-none">
            <div className="border-b border-border/40 pb-2">
              <span className="font-label text-xs uppercase tracking-wider font-bold text-primary block">
                Inbox Study Resources ({unprocessedResources.length})
              </span>
              <span className="font-sans text-[10px] text-secondary leading-relaxed block mt-0.5">
                Process unfiled slips and convert them to structured knowledge.
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {unprocessedResources.length > 0 ? (
                unprocessedResources.map((item) => (
                  <div key={item.id} className="p-3 bg-background border border-border space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-label text-[8px] bg-accent/10 text-accent px-1.5 py-0.5 uppercase tracking-wider font-bold">
                        {item.type}
                      </span>
                      <button
                        onClick={() => updateInboxItemStatus(item.id, 'archived')}
                        className="font-label text-[8px] uppercase font-bold text-secondary hover:text-tertiary cursor-pointer"
                      >
                        Archive
                      </button>
                    </div>
                    <p className="font-sans font-bold text-primary truncate">{item.title}</p>
                    {item.content && <p className="font-sans text-[10px] text-secondary line-clamp-2 leading-relaxed">{item.content}</p>}
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleConvertCapture(item)}
                        className="font-label text-[9px] uppercase font-bold text-accent hover:opacity-85 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Convert to Note</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-sans text-xs text-secondary italic text-center py-4">No unprocessed study resources.</p>
              )}
            </div>
          </div>

          {/* Open inquiries */}
          <div className="bg-surface border border-border p-5 space-y-4 rounded-none shadow-none">
            <div className="border-b border-border/40 pb-2">
              <span className="font-label text-xs uppercase tracking-wider font-bold text-primary block">
                Open Learning Questions ({openQuestions.length})
              </span>
              <span className="font-sans text-[10px] text-secondary block mt-0.5">
                Derived dynamically from daily command briefs.
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {openQuestions.length > 0 ? (
                openQuestions.map((q) => (
                  <div key={q.id} className="p-3.5 bg-background border border-border space-y-2 text-xs animate-fade-in">
                    <span className="font-label text-[8px] text-secondary block">{new Date(q.date).toLocaleDateString()}</span>
                    <p className="font-sans font-bold text-primary leading-snug">{q.question}</p>
                    <div className="flex gap-2 justify-end pt-1 font-label text-[8px] font-bold">
                      <Link
                        href={`/review/midday`}
                        className="border border-border hover:border-primary px-2 py-0.5 bg-surface"
                      >
                        ANSWER
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-sans text-xs text-secondary italic text-center py-4">All inquiries resolved.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="bg-surface border border-border py-16 text-center rounded-none shadow-none">
          <p className="font-label text-xs uppercase tracking-wider text-secondary font-bold">Loading Academy Studio...</p>
        </div>
      </PageShell>
    }>
      <AcademyContent />
    </Suspense>
  );
}
