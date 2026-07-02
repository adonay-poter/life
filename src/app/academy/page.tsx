'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard, CourseModule, Lesson } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ResearchModal from '@/components/ResearchModal';
import QAPanel from '@/components/QAPanel';
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
  Upload
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
    updateLesson
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
  const [academyTab, setAcademyTab] = useState<'matrix' | 'flashcards'>('matrix');
  const [isNotePreview, setIsNotePreview] = useState(false);
  const [mobileStudioTab, setMobileStudioTab] = useState<'index' | 'notepad'>('index');

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeModule = courseModules.find((m) => m.id === selectedModuleId);

  const [localNotes, setLocalNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const notesRef = useRef(localNotes);
  const activeModuleIdRef = useRef(activeModule?.id);
  const courseModulesRef = useRef(courseModules);

  // Sync refs
  const lastSavedNotesRef = useRef(localNotes);

  useEffect(() => {
    notesRef.current = localNotes;
  }, [localNotes]);

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
    showToast,
    updateModuleNotes
  ]);

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

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="italic text-secondary">Empty notepad. Input notes on edit view...</p>;
    
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
          <pre key={`code-${i}`} className="bg-neutral-bg/60 border border-secondary/20 p-3 rounded-sm font-mono text-[11px] text-primary overflow-x-auto my-3 leading-relaxed whitespace-pre">
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
            <div key={`table-${i}`} className="overflow-x-auto my-3 border border-secondary/25 rounded-sm">
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
          <blockquote key={`quote-${i}`} className="border-l-2 border-tertiary pl-3 py-1 bg-neutral-bg/50 font-sans text-xs italic text-secondary my-3">
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
          <ul key={`list-${i}`} className="list-disc pl-5 my-2 text-xs space-y-1">
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
          <h4 key={i} className="font-display text-lg font-bold text-primary mt-4 mb-2 border-b border-secondary/15 pb-1">
            {renderMarkdownInline(line.slice(2))}
          </h4>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h5 key={i} className="font-display text-md font-bold text-primary mt-3.5 mb-1.5">
            {renderMarkdownInline(line.slice(3))}
          </h5>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h6 key={i} className="font-sans text-xs font-bold text-primary mt-3 mb-1">
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
          <p key={i} className="font-sans text-xs text-primary min-h-[1em] leading-relaxed my-2">
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
    if (!selectedCourseId) return [];
    const now = new Date();
    return flashcards.filter((fc) => {
      const isDue = fc.course_id === selectedCourseId && new Date(fc.next_review_date) <= now;
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
      <div className="space-y-12 animate-pulse">
        <header className="border-b-2 border-secondary/20 pb-4">
          <div className="h-8 bg-secondary/15 w-48 rounded-sm mb-2" />
          <div className="h-4 bg-secondary/10 w-80 rounded-sm" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface border border-secondary/20 p-6 rounded-sm space-y-4">
              <div className="h-4 bg-secondary/15 w-1/4 rounded-sm" />
              <div className="h-6 bg-secondary/15 w-3/4 rounded-sm" />
              <div className="h-16 bg-secondary/10 w-full rounded-sm" />
              <div className="h-8 bg-secondary/10 w-full rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header / Navigation state */}
      {!selectedCourseId ? (
        <header className="border-b-2 border-primary pb-4 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
              THE ACADEMY
            </h2>
            <p className="font-label text-xs text-secondary uppercase tracking-[0.2em] mt-0.5">
              Course Matrices &bull; Spaced Repetition Flashcards
            </p>
          </div>
        </header>
      ) : (
        <header className="border-b-2 border-primary pb-4 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 w-full">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setSelectedModuleId(null);
              }}
              className="text-secondary hover:text-primary transition-all p-1 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="truncate max-w-full">
              <h2 className="font-display text-2xl font-bold tracking-tight text-primary truncate max-w-xs md:max-w-md lg:max-w-lg">
                {activeCourse?.title}
              </h2>
              <p className="font-label text-xs text-secondary uppercase tracking-[0.25em]">
                STUDIO WORKSPACE &bull; {activeCourse?.category}
              </p>
            </div>
          </div>

          <div className="flex border border-secondary font-label text-xs uppercase tracking-wider select-none shrink-0 self-end">
            <button
              onClick={() => setAcademyTab('matrix')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                academyTab === 'matrix' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Studio Notepad</span>
            </button>
            <button
              onClick={() => setAcademyTab('flashcards')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all border-l border-secondary cursor-pointer ${
                academyTab === 'flashcards' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Flashcard deck ({dueCards.length})</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      {!selectedCourseId ? (
        /* ==========================================
            VIEW 1: COURSE & SKILL MATRIX LIST
           ========================================== */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-secondary" />
              <input
                type="text"
                placeholder="Search matrices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-secondary/40 rounded-sm text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setResearchModalOpen(true)}
                className="btn-tertiary flex items-center space-x-1.5 cursor-pointer w-full md:w-auto justify-center bg-primary text-on-primary hover:bg-primary/90"
              >
                <Search className="h-4 w-4 text-tertiary" />
                <span>AI RESEARCH</span>
              </button>
              <button
                onClick={() => setShowAddCourse(!showAddCourse)}
                className="btn-tertiary flex items-center space-x-1.5 cursor-pointer w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4" />
                <span>ADD SKILL MATRIX</span>
              </button>
            </div>
          </div>

          {/* Add Course Form */}
          {showAddCourse && (
            <form onSubmit={handleAddCourse} className="bg-surface border border-secondary p-6 rounded-sm space-y-4 font-label text-xs">
              <span className="block font-bold text-sm uppercase text-primary border-b border-secondary/25 pb-2">
                Configure New Skill Matrix
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-secondary">Course / Matrix Title</label>
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. History of Modern Architecture"
                    required
                    className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-secondary">Category (Skill Class)</label>
                  <input
                    type="text"
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="e.g. Design, Philosophy, Technology"
                    className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary">Skill Roadmap Summary</label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2 uppercase text-xs tracking-wider font-bold cursor-pointer rounded-sm">
                  Save Skill Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-2 border border-secondary text-primary hover:bg-neutral-bg uppercase text-xs tracking-wider cursor-pointer rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Courses grid */}
          {courses.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-secondary/25 rounded-sm">
              <BookOpen className="h-12 w-12 text-secondary/40 mx-auto mb-4 animate-pulse" />
              <h3 className="font-display text-lg font-bold text-primary mb-2">No skill matrices yet</h3>
              <p className="font-sans text-xs text-secondary max-w-sm mx-auto mb-6">
                Create a skill matrix to start organizing your courses, modules, lessons, and flashcards.
              </p>
              <button
                onClick={() => setShowAddCourse(true)}
                className="bg-primary text-on-primary px-5 py-2 uppercase text-xs tracking-wider font-bold cursor-pointer hover:bg-primary/90 transition-all rounded-sm"
              >
                Create one to begin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses
                .filter(c => 
                  c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((course) => {
                  const progress = calculateCourseProgress(course.id);
                  return (
                    <div
                      key={course.id}
                      className="bg-surface border border-secondary/40 p-5 flex flex-col justify-between space-y-6 rounded-sm relative group hover:border-primary transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="space-y-2">
                        <span className="font-label text-xs bg-secondary/20 px-1.5 py-0.5 text-primary uppercase tracking-wide">
                          {course.category}
                        </span>
                        <h4 className="font-display text-lg font-bold text-primary tracking-tight line-clamp-1">
                          {course.title}
                        </h4>
                        {course.description && (
                          <p className="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-secondary/20 pt-4 flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-label text-xs text-secondary uppercase tracking-wider block">
                              Completion
                            </span>
                            <span className="font-display text-md font-semibold text-tertiary">
                              {progress}%
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              const modules = courseModules.filter((m) => m.course_id === course.id);
                              if (modules.length > 0) {
                                setSelectedModuleId(modules[0].id);
                              }
                            }}
                            className="border border-primary hover:bg-primary hover:text-on-primary transition-all px-3 py-1.5 font-label text-xs uppercase tracking-widest font-bold cursor-pointer"
                          >
                            ENTER STUDIO
                          </button>
                        </div>
                        
                        {/* Animated Progress Bar */}
                        <div className="w-full bg-secondary/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-tertiary h-full transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Edit/Delete Actions */}
                      <div className="absolute right-4 top-4 flex space-x-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setCourseToEdit(course);
                            setEditCourseTitle(course.title);
                            setEditCourseDesc(course.description || '');
                            setEditCourseCategory(course.category || '');
                            setEditCourseModalOpen(true);
                          }}
                          className="text-secondary hover:text-primary cursor-pointer"
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
                  );
                })}
            </div>
          )}
        </div>
      ) : academyTab === 'matrix' ? (
        /* ==========================================
            VIEW 2: SPLIT-SCREEN STUDY STUDIO
           ========================================== */
        <div className="space-y-6">
          {/* Mobile tab switcher for split-screen */}
          <div className="flex lg:hidden border border-secondary font-label text-xs">
            <button
              type="button"
              onClick={() => setMobileStudioTab('index')}
              className={`flex-1 text-center py-2 uppercase tracking-wider font-bold cursor-pointer ${
                mobileStudioTab === 'index' ? 'bg-primary text-on-primary' : 'text-primary bg-surface'
              }`}
            >
              Index
            </button>
            <button
              type="button"
              onClick={() => setMobileStudioTab('notepad')}
              className={`flex-1 text-center py-2 uppercase tracking-wider font-bold cursor-pointer border-l border-secondary ${
                mobileStudioTab === 'notepad' ? 'bg-primary text-on-primary' : 'text-primary bg-surface'
              }`}
            >
              Studio Notepad
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
            
            {/* LEFT SIDE: HIERARCHICAL INDEX CHECKLIST */}
            <section className={`bg-surface border border-secondary p-6 rounded-sm space-y-6 max-h-[600px] overflow-y-auto shadow-sm ${
              mobileStudioTab !== 'index' ? 'hidden lg:block' : ''
            }`}>
            <div className="border-b border-secondary/20 pb-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                  Modules & Lessons Index
                </span>
                <button
                  onClick={() => setNewModuleModalOpen(true)}
                  className="bg-primary text-on-primary text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-sm cursor-pointer hover:bg-opacity-90 btn-press flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Module</span>
                </button>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-secondary" />
                <input
                  type="text"
                  placeholder="Search modules or lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 bg-neutral-bg/50 border border-secondary/30 rounded-sm text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Modules map */}
            <div className="space-y-6">
              {courseModules
                .filter((m) => m.course_id === selectedCourseId)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                .filter((mod) => {
                  const titleMatch = mod.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const hasMatchingLesson = lessons.some(
                    (l) => l.module_id === mod.id && l.title.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  return titleMatch || hasMatchingLesson;
                })
                .map((mod) => {
                  const modLessons = lessons
                    .filter((l) => l.module_id === mod.id)
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                    .filter((l) => 
                      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      mod.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  const isSelected = selectedModuleId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className={`p-4 border transition-all rounded-sm ${
                        isSelected ? 'border-primary bg-neutral-bg/40 shadow-sm' : 'border-secondary/25 bg-surface'
                      }`}
                    >
                      <div className="flex justify-between items-baseline mb-3 group/mod">
                        {editingModuleId === mod.id ? (
                          <div className="flex-grow flex gap-2">
                            <input
                              type="text"
                              value={editModuleName}
                              onChange={(e) => setEditModuleName(e.target.value)}
                              className="flex-grow bg-surface border border-secondary px-2 py-0.5 font-display text-sm text-primary focus:outline-none"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  if (!editModuleName.trim()) return;
                                  await updateModule(mod.id, { title: editModuleName });
                                  setEditingModuleId(null);
                                  showToast('Module title updated.', 'success');
                                }}
                                className="bg-primary text-on-primary px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingModuleId(null)}
                                className="border border-secondary px-2 py-0.5 text-[10px] uppercase rounded-sm cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 flex-grow min-w-0">
                            <h5
                              onClick={() => {
                                setSelectedModuleId(mod.id);
                                setMobileStudioTab('notepad');
                              }}
                              className="font-display text-md font-bold text-primary hover:text-tertiary cursor-pointer truncate max-w-[150px] sm:max-w-[200px] md:max-w-[250px]"
                            >
                              {mod.title}
                            </h5>
                            
                            <div className="hidden group-hover/mod:flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => {
                                  setEditingModuleId(mod.id);
                                  setEditModuleName(mod.title);
                                }}
                                className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete({ id: mod.id, title: mod.title, type: 'module' });
                                  setDeleteModalOpen(true);
                                }}
                                className="text-secondary hover:text-tertiary p-0.5 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleReorderModule(mod.id, 'up')}
                                className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleReorderModule(mod.id, 'down')}
                                className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        <span className="font-label text-[10px] text-secondary uppercase shrink-0 bg-secondary/10 px-1.5 py-0.5 rounded-sm">
                          Module {mod.order_index}
                        </span>
                      </div>

                      {/* Lessons checklist */}
                      <div className="space-y-2 mb-4">
                        {modLessons.map((l) => (
                          <div key={l.id} className="flex items-center justify-between p-2 bg-surface border border-secondary/15 rounded-sm group/les">
                            {editingLessonId === l.id ? (
                              <div className="flex-grow flex flex-col gap-1.5 font-label text-xs w-full">
                                <input
                                  type="text"
                                  value={editLessonName}
                                  onChange={(e) => setEditLessonName(e.target.value)}
                                  className="w-full bg-surface border border-secondary/50 px-2 py-1 focus:outline-none"
                                  placeholder="Lesson title"
                                />
                                <input
                                  type="text"
                                  value={editLessonLink}
                                  onChange={(e) => setEditLessonLink(e.target.value)}
                                  className="w-full bg-surface border border-secondary/50 px-2 py-1 focus:outline-none"
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
                                      await updateLesson(l.id, { title: editLessonName, link: formatted || undefined });
                                      setEditingLessonId(null);
                                      showToast('Lesson updated.', 'success');
                                    }}
                                    className="bg-primary text-on-primary px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingLessonId(null)}
                                    className="border border-secondary px-2 py-0.5 text-[10px] uppercase rounded-sm cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-2 flex-grow min-w-0">
                                  <button
                                    onClick={() => toggleLessonCompleted(l.id, !l.completed)}
                                    className="text-secondary hover:text-tertiary shrink-0 cursor-pointer active:scale-95 transition-transform duration-150"
                                  >
                                    {l.completed ? (
                                      <CheckSquare className="h-4 w-4 text-emerald-700 animate-in zoom-in-75 duration-200" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                  <span className={`font-sans text-xs text-primary truncate ${l.completed ? 'line-through text-secondary opacity-70' : ''}`}>
                                    {l.title}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  {l.link && (
                                    <a
                                      href={l.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-secondary hover:text-tertiary"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  
                                  <div className="hidden group-hover/les:flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingLessonId(l.id);
                                        setEditLessonName(l.title);
                                        setEditLessonLink(l.link || '');
                                      }}
                                      className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setItemToDelete({ id: l.id, title: l.title, type: 'lesson' });
                                        setDeleteModalOpen(true);
                                      }}
                                      className="text-secondary hover:text-tertiary p-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleReorderLesson(l.id, 'up')}
                                      className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleReorderLesson(l.id, 'down')}
                                      className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Lesson Input */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-secondary/15 space-y-2 font-label text-xs">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={newLessonName}
                              onChange={(e) => setNewLessonName(e.target.value)}
                              placeholder="Add Lesson Title..."
                              className="flex-grow bg-neutral-bg border border-secondary/40 px-2 py-1 text-xs focus:outline-none"
                            />
                            <input
                              type="text"
                              value={newLessonLink}
                              onChange={(e) => setNewLessonLink(e.target.value)}
                              placeholder="Link (optional)..."
                              className="flex-grow bg-neutral-bg border border-secondary/40 px-2 py-1 text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddLesson(mod.id)}
                              className="bg-primary text-on-primary px-3 py-1 font-bold uppercase tracking-wider cursor-pointer rounded-sm shrink-0"
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

            {/* New Module controller removed from bottom (moved to top popup) */}
          </section>

          {/* RIGHT SIDE: INTEGRATED MARKDOWN NOTES NOTEPAD */}
          <section className={`bg-surface border border-secondary p-6 rounded-sm flex flex-col justify-between min-h-[500px] shadow-sm ${
            mobileStudioTab !== 'notepad' ? 'hidden lg:block' : ''
          }`}>
            {activeModule ? (
              <div className="space-y-4 flex-grow flex flex-col justify-between h-full">
                <div className="flex justify-between items-center border-b border-secondary/25 pb-2">
                  <div className="truncate pr-4 flex-grow">
                    <span className="font-label text-xs text-secondary uppercase">Studio Notepad</span>
                    <h5 className="font-display text-md font-bold text-primary truncate max-w-xs sm:max-w-md lg:max-w-lg">
                      {activeModule.title}
                    </h5>
                  </div>

                  {/* Toggle Preview / Edit / Version History */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className="p-1 border border-secondary hover:bg-neutral-bg transition-all text-primary flex items-center justify-center cursor-pointer rounded-sm"
                        title="Version History"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      
                      {showHistoryDropdown && (
                        <div className="absolute right-0 mt-1 w-64 bg-surface border border-secondary shadow-lg rounded-sm z-50 text-[11px] max-h-48 overflow-y-auto">
                          <span className="block p-2 font-bold border-b border-secondary/20 bg-neutral-bg uppercase text-[10px]">
                            Notes Version History
                          </span>
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
                                className="w-full text-left p-2 border-b border-secondary/10 hover:bg-neutral-bg flex flex-col justify-start"
                              >
                                <span className="font-bold text-primary">
                                  {hIdx === 0 ? 'Current Session' : `Version ${notesHistory.length - hIdx}`}
                                </span>
                                <span className="text-[9px] text-secondary">
                                  {new Date(historyItem.timestamp).toLocaleString()}
                                </span>
                                <span className="text-[9px] text-secondary truncate w-full mt-0.5">
                                  {historyItem.notes.slice(0, 40) || '(empty)'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex border border-secondary font-label text-xs">
                      <button
                        onClick={() => setIsNotePreview(false)}
                        className={`px-2 py-1 flex items-center space-x-1 cursor-pointer ${!isNotePreview ? 'bg-primary text-on-primary' : 'text-primary'}`}
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>EDIT</span>
                      </button>
                      <button
                        onClick={() => setIsNotePreview(true)}
                        className={`px-2 py-1 flex items-center space-x-1 border-l border-secondary cursor-pointer ${isNotePreview ? 'bg-primary text-on-primary' : 'text-primary'}`}
                      >
                        <Eye className="h-3 w-3" />
                        <span>PREVIEW</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit notepad area */}
                <div className="flex-grow mt-4 flex flex-col">
                  {!isNotePreview ? (
                    <textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="# Markdown Notes here&#10;- Bullet point one&#10;- Bullet point two&#10;> An architectural quote"
                      className="w-full flex-grow h-[350px] lg:h-[450px] bg-neutral-bg/45 border border-secondary/30 px-4 py-3 text-xs text-primary focus:outline-none focus:border-tertiary font-mono resize-none leading-relaxed"
                    />
                  ) : (
                    <div className="w-full flex-grow h-[350px] lg:h-[450px] bg-surface border border-secondary/15 px-4 py-3 overflow-y-auto space-y-2 border-heritage rounded-sm">
                      {renderMarkdown(localNotes)}
                    </div>
                  )}
                </div>

                <div className="border-t border-secondary/20 pt-3 flex justify-between items-center text-xs font-label text-secondary">
                  <span>{isSavingNotes ? 'Saving...' : 'Notes auto-saved to backend'}</span>
                  <span className="font-mono">Markdown syntax supported</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 flex-grow flex flex-col justify-center">
                <BookOpen className="h-10 w-10 text-secondary/40 mx-auto mb-2" />
                <p className="font-sans text-xs text-secondary italic">No active module selected. Select a module from index hierarchy.</p>
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
          <section className="lg:col-span-2 bg-surface border border-secondary p-6 rounded-sm flex flex-col justify-between min-h-[400px] shadow-sm">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-secondary/20 pb-2">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                  Leitner Review Station ({dueCards.length} cards due)
                </span>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-secondary" />
                  <input
                    type="text"
                    placeholder="Search deck..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 bg-neutral-bg/50 border border-secondary/30 rounded-sm text-[10px] focus:outline-none focus:border-primary"
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
                        className="absolute inset-0 w-full h-full border border-secondary bg-neutral-bg flex flex-col justify-center p-6 rounded-sm shadow-sm"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden'
                        }}
                      >
                        <span className="absolute top-3 left-3 font-label text-[10px] text-secondary uppercase">
                          Box {activeCard.box} &bull; Question
                        </span>
                        <p className="font-display text-sm text-center text-primary leading-relaxed font-semibold px-4">
                          {activeCard.front}
                        </p>
                        <span className="absolute bottom-3 right-3 font-label text-[9px] text-secondary uppercase tracking-wider">
                          Click Card to Flip
                        </span>
                      </div>

                      {/* Back Side */}
                      <div
                        className="absolute inset-0 w-full h-full border border-secondary bg-neutral-bg flex flex-col justify-center p-6 rounded-sm shadow-sm"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <span className="absolute top-3 left-3 font-label text-[10px] text-secondary uppercase">
                          Box {activeCard.box} &bull; Answer
                        </span>
                        <p className="font-display text-sm text-center text-primary leading-relaxed font-semibold px-4">
                          {activeCard.back}
                        </p>
                        <span className="absolute bottom-3 right-3 font-label text-[9px] text-secondary uppercase tracking-wider">
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
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2 uppercase font-bold tracking-wider rounded-sm cursor-pointer"
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
                        className="flex-1 bg-tertiary hover:bg-tertiary/90 text-on-primary py-2 uppercase font-bold tracking-wider rounded-sm cursor-pointer"
                      >
                        Incorrect (Box 1)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24">
                  <span className="font-display text-md italic text-secondary block">No cards due for review.</span>
                  <span className="font-sans text-xs text-secondary mt-1 block">Leitner box intervals satisfied. Add flashcards below.</span>
                </div>
              )}
            </div>

            {/* Deck queue list footer */}
            {dueCards.length > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-secondary/20 font-label text-xs">
                <button
                  disabled={activeFlashcardIndex === 0}
                  onClick={() => { setActiveFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
                  className="text-secondary disabled:opacity-30 uppercase cursor-pointer"
                >
                  &larr; Prev Card
                </button>
                <span className="text-secondary">Card {activeFlashcardIndex + 1} of {dueCards.length}</span>
                <button
                  disabled={activeFlashcardIndex === dueCards.length - 1}
                  onClick={() => { setActiveFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
                  className="text-secondary disabled:opacity-30 uppercase cursor-pointer"
                >
                  Next Card &rarr;
                </button>
              </div>
            )}
          </section>

          {/* Flashcard Side Panel: Stats + Single Add / Bulk Import */}
          <div className="space-y-6">
            
            {/* Statistics */}
            <section className="bg-surface border border-secondary p-5 rounded-sm space-y-4 font-label text-xs shadow-sm">
              <span className="block text-xs uppercase text-secondary font-bold border-b border-secondary/20 pb-1">
                Deck Statistics
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-bg p-2.5 border border-secondary/15 rounded-sm">
                  <span className="block text-[9px] text-secondary uppercase">Total Cards</span>
                  <span className="text-md font-bold font-display text-primary">{totalCards}</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-secondary/15 rounded-sm">
                  <span className="block text-[9px] text-secondary uppercase">Mastery Rate</span>
                  <span className="text-md font-bold font-display text-tertiary">{masteryRate}%</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-secondary/15 rounded-sm">
                  <span className="block text-[9px] text-secondary uppercase">Accuracy Rate</span>
                  <span className="text-md font-bold font-display text-emerald-800">{totalReviews > 0 ? `${accuracyRate}%` : '0%'}</span>
                </div>
                <div className="bg-neutral-bg p-2.5 border border-secondary/15 rounded-sm">
                  <span className="block text-[9px] text-secondary uppercase">Total Reviews</span>
                  <span className="text-md font-bold font-display text-primary">{totalReviews}</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <span className="block text-[10px] text-secondary uppercase font-bold">Leitner Box Distribution</span>
                <div className="flex items-center space-x-1">
                  {boxCounts.map((count, i) => {
                    const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
                    return (
                      <div key={i} className="flex-grow flex flex-col items-center">
                        <div className="w-full bg-neutral-bg h-12 rounded-sm relative border border-secondary/15 flex items-end">
                          <div 
                            className="w-full bg-tertiary/80 rounded-t-sm transition-all duration-300"
                            style={{ height: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[9px] text-primary">
                            {count}
                          </span>
                        </div>
                        <span className="text-[9px] text-secondary uppercase mt-1">B{i+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Flashcard Add Panel */}
            <section className="bg-surface border border-secondary p-6 rounded-sm shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-secondary/20 pb-2">
                <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] font-bold">
                  {isBulkImport ? 'Bulk Import' : 'Add Flashcard'}
                </span>
                <button
                  onClick={() => setIsBulkImport(!isBulkImport)}
                  className="text-secondary hover:text-primary text-[10px] uppercase font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  <span>{isBulkImport ? 'Single' : 'Bulk'}</span>
                </button>
              </div>

              {!isBulkImport ? (
                <form onSubmit={handleAddFlashcardSubmit} className="space-y-4 font-label text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary">Module Source</label>
                    <select
                      value={fcModuleId}
                      onChange={(e) => setFcModuleId(e.target.value)}
                      required
                      className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none font-sans"
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
                    <label className="block text-xs uppercase text-secondary">Front Question</label>
                    <textarea
                      value={fcQuestion}
                      onChange={(e) => setFcQuestion(e.target.value)}
                      rows={2}
                      placeholder="e.g. What is a Service Worker lifecycle?"
                      required
                      className="w-full bg-neutral-bg border border-secondary px-3 py-1.5 focus:outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary">Back Answer</label>
                    <textarea
                      value={fcAnswer}
                      onChange={(e) => setFcAnswer(e.target.value)}
                      rows={2}
                      placeholder="e.g. Install, Activate, Idle, Fetch"
                      required
                      className="w-full bg-neutral-bg border border-secondary px-3 py-1.5 focus:outline-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!fcModuleId || !fcQuestion || !fcAnswer}
                    className="w-full btn-tertiary uppercase text-xs tracking-wider font-bold mt-2 cursor-pointer rounded-sm"
                  >
                    SAVE FLASHCARD
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBulkImportSubmit} className="space-y-4 font-label text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase text-secondary">Module Source</label>
                    <select
                      value={fcModuleId}
                      onChange={(e) => setFcModuleId(e.target.value)}
                      required
                      className="w-full bg-neutral-bg border border-secondary px-2 py-1.5 focus:outline-none font-sans"
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
                    <label className="block text-xs uppercase text-secondary">Paste CSV or TSV (one card per line)</label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={6}
                      placeholder="Question 1, Answer 1&#10;Question 2, Answer 2&#10;Or use tab-separation from spreadsheet"
                      required
                      className="w-full bg-neutral-bg border border-secondary px-3 py-1.5 focus:outline-none font-mono"
                    />
                    <p className="text-[9px] text-secondary mt-1">Format: Front / Question, Back / Answer</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!fcModuleId || !bulkText.trim()}
                    className="w-full btn-tertiary uppercase text-xs tracking-wider font-bold mt-2 cursor-pointer rounded-sm"
                  >
                    IMPORT FLASHCARDS
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* Flashcard list footer directory */}
          {courseCards.length > 0 && (
            <section className="lg:col-span-3 bg-surface border border-secondary p-6 rounded-sm space-y-4 shadow-sm">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block border-b border-secondary/20 pb-1">
                Deck Cards Directory ({courseCards.length} cards)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-label">
                  <thead>
                    <tr className="border-b border-secondary/30 text-secondary uppercase">
                      <th className="py-2 font-semibold">Front (Question)</th>
                      <th className="py-2 font-semibold">Back (Answer)</th>
                      <th className="py-2 font-semibold text-center">Box</th>
                      <th className="py-2 font-semibold text-center">Reviews (Acc)</th>
                      <th className="py-2 font-semibold">Next Review</th>
                      <th className="py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/10 font-sans">
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
                            className="text-secondary hover:text-tertiary cursor-pointer"
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

      {/* Edit Course Modal */}
      {editCourseModalOpen && courseToEdit && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-backdrop">
          <div className="bg-surface border border-secondary p-6 rounded-sm w-full max-w-lg space-y-4 font-label text-xs shadow-xl animate-modal">
            <span className="block font-bold text-sm uppercase text-primary border-b border-secondary/25 pb-2">
              Edit Skill Matrix
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary">Course / Matrix Title</label>
                <input
                  type="text"
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-secondary">Category (Skill Class)</label>
                <input
                  type="text"
                  value={editCourseCategory}
                  onChange={(e) => setEditCourseCategory(e.target.value)}
                  className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase text-secondary">Skill Roadmap Summary</label>
              <textarea
                value={editCourseDesc}
                onChange={(e) => setEditCourseDesc(e.target.value)}
                rows={3}
                className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
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
                className="flex-1 bg-primary text-on-primary py-2 uppercase text-xs tracking-wider font-bold cursor-pointer rounded-sm"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditCourseModalOpen(false);
                  setCourseToEdit(null);
                }}
                className="px-4 py-2 border border-secondary text-primary hover:bg-neutral-bg uppercase text-xs tracking-wider cursor-pointer rounded-sm"
              >
                Cancel
              </button>
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
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-backdrop"
        >
          <div className="bg-surface border border-secondary p-6 rounded-sm w-full max-w-md space-y-4 font-label text-xs shadow-xl animate-modal">
            <span className="block font-bold text-sm uppercase text-primary border-b border-secondary/25 pb-2">
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
                <label className="block text-xs uppercase text-secondary">Module Title</label>
                <input
                  type="text"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="e.g. Fundamental Concepts..."
                  required
                  className="w-full bg-neutral-bg border border-secondary px-2.5 py-1.5 focus:outline-none font-sans text-primary text-xs"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={!newModuleName.trim()}
                  className="flex-1 bg-primary text-on-primary py-2 uppercase text-xs tracking-wider font-bold cursor-pointer rounded-sm disabled:opacity-50 btn-press"
                >
                  Create Module
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewModuleModalOpen(false);
                    setNewModuleName('');
                  }}
                  className="px-4 py-2 border border-secondary text-primary hover:bg-neutral-bg uppercase text-xs tracking-wider cursor-pointer rounded-sm btn-press"
                >
                  Cancel
                </button>
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
          topic={activeCourse.title}
          moduleNotes={activeModule.notes || ''}
        />
      )}
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense fallback={
      <div className="bg-surface border border-secondary/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-secondary italic">Loading Academy Studio...</p>
      </div>
    }>
      <AcademyContent />
    </Suspense>
  );
}
