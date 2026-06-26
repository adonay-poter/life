'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
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
  Edit3
} from 'lucide-react';

function AcademyContent() {
  const {
    courses,
    courseModules,
    lessons,
    flashcards,
    addCourse,
    deleteCourse,
    addModule,
    updateModuleNotes,
    addLesson,
    toggleLessonCompleted,
    addFlashcard,
    reviewFlashcard
  } = useDashboard();

  const searchParams = useSearchParams();
  const targetCourseId = searchParams ? searchParams.get('courseId') : null;
  const { showToast } = useToast();

  // Delete confirmation modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  // Navigation & UI States
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [academyTab, setAcademyTab] = useState<'matrix' | 'flashcards'>('matrix');
  const [isNotePreview, setIsNotePreview] = useState(false);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeModule = courseModules.find((m) => m.id === selectedModuleId);

  const [localNotes, setLocalNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const notesRef = useRef(localNotes);
  const activeModuleIdRef = useRef(activeModule?.id);

  // Sync ref
  useEffect(() => {
    notesRef.current = localNotes;
  }, [localNotes]);

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
      setLocalNotes(activeModule.notes || '');
      activeModuleIdRef.current = activeModule.id;
    } else {
      setLocalNotes('');
      activeModuleIdRef.current = undefined;
    }
  }, [selectedModuleId, activeModule?.id]);

  // Debounced save
  useEffect(() => {
    if (!activeModule) return;
    if (localNotes === (activeModule.notes || '')) return;

    setIsSavingNotes(true);
    const timer = setTimeout(async () => {
      await updateModuleNotes(activeModule.id, localNotes);
      setIsSavingNotes(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [localNotes]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (activeModuleIdRef.current) {
        const mod = courseModules.find((m) => m.id === activeModuleIdRef.current);
        if (mod && notesRef.current !== (mod.notes || '')) {
          updateModuleNotes(activeModuleIdRef.current, notesRef.current);
        }
      }
    };
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
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // URL Target Course Auto-select Effect
  useEffect(() => {
    if (targetCourseId) {
      const course = courses.find((c) => c.id === targetCourseId);
      if (course) {
        setSelectedCourseId(targetCourseId);
        const modules = courseModules.filter((m) => m.course_id === targetCourseId);
        if (modules.length > 0) {
          setSelectedModuleId(modules[0].id);
        }
      }
    }
  }, [targetCourseId, courses, courseModules]);

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

  const handleAddLesson = (moduleId: string) => {
    if (!newLessonName.trim()) {
      showToast('Lesson name cannot be empty.', 'error');
      return;
    }
    addLesson(moduleId, newLessonName, newLessonLink || undefined);
    showToast('Lesson added successfully.', 'success');
    setNewLessonName('');
    setNewLessonLink('');
  };

  const handleAddFlashcardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcQuestion.trim() || !fcAnswer.trim() || !selectedCourseId || !selectedModuleId) {
      showToast('Please fill out all required flashcard fields.', 'error');
      return;
    }
    addFlashcard(selectedCourseId, selectedModuleId, fcQuestion, fcAnswer);
    showToast('Flashcard saved successfully.', 'success');
    setFcQuestion('');
    setFcAnswer('');
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
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="italic text-[#6C7278]">Empty notepad. Input notes on edit view...</p>;
    
    // Very lightweight parsing of headings (#), lists (-), bold (**), blockquotes (>)
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h4 key={idx} className="font-display text-lg font-bold text-[#1A1C1E] mt-3 mb-2">{line.replace('# ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h5 key={idx} className="font-display text-md font-bold text-[#1A1C1E] mt-2 mb-1.5">{line.replace('## ', '')}</h5>;
      }
      if (line.startsWith('### ')) {
        return <h6 key={idx} className="font-sans text-xs font-bold text-[#1A1C1E] mt-2 mb-1">{line.replace('### ', '')}</h6>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="font-sans text-xs text-[#1A1C1E] ml-4 list-disc mt-1">{line.slice(2)}</li>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-2 border-[#B8422E] pl-3 py-1 bg-[#F7F5F2] font-sans text-xs italic text-[#6C7278] my-2">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      // Simple Bold replacement
      const cleanLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const matches = [...cleanLine.matchAll(boldRegex)];
      if (matches.length > 0) {
        return (
          <p key={idx} className="font-sans text-xs text-[#1A1C1E] min-h-[1em] leading-relaxed mt-1.5">
            {cleanLine.split('**').map((chunk, i) => i % 2 === 1 ? <strong key={i} className="font-bold">{chunk}</strong> : chunk)}
          </p>
        );
      }

      return <p key={idx} className="font-sans text-xs text-[#1A1C1E] min-h-[1em] leading-relaxed mt-1.5">{line}</p>;
    });
  };

  // Find due flashcards (next_review_date <= now, or box = 1, linked to selected course)
  const getDueFlashcards = () => {
    if (!selectedCourseId) return [];
    const now = new Date();
    return flashcards.filter((fc) => {
      return fc.course_id === selectedCourseId && new Date(fc.next_review_date) <= now;
    });
  };

  // activeCourse and activeModule defined above
  
  const dueCards = getDueFlashcards();
  const activeCard = dueCards[activeFlashcardIndex];

  return (
    <div className="space-y-12">
      {/* Header / Navigation state */}
      {!selectedCourseId ? (
        <header className="border-b-2 border-[#1A1C1E] pb-4 flex justify-between items-baseline">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
              THE ACADEMY
            </h2>
            <p className="font-label text-xs text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
              Course Matrices &bull; Spaced Repetition Flashcards
            </p>
          </div>
        </header>
      ) : (
        <header className="border-b-2 border-[#1A1C1E] pb-4 flex flex-col md:flex-row justify-between items-baseline gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setSelectedModuleId(null);
              }}
              className="text-[#6C7278] hover:text-[#1A1C1E] transition-all p-1 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#1A1C1E]">
                {activeCourse?.title}
              </h2>
              <p className="font-label text-xs text-[#6C7278] uppercase tracking-[0.25em]">
                STUDIO WORKSPACE &bull; {activeCourse?.category}
              </p>
            </div>
          </div>

          <div className="flex border border-[#6C7278] font-label text-xs uppercase tracking-wider select-none shrink-0 self-end">
            <button
              onClick={() => setAcademyTab('matrix')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                academyTab === 'matrix' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Studio Notepad</span>
            </button>
            <button
              onClick={() => setAcademyTab('flashcards')}
              className={`px-3 py-1.5 flex items-center space-x-1.5 transition-all border-l border-[#6C7278] cursor-pointer ${
                academyTab === 'flashcards' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
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
          <div className="flex justify-between items-center">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.1em]">
              Learning Matrices
            </span>
            <button
              onClick={() => setShowAddCourse(!showAddCourse)}
              className="btn-tertiary flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>ADD SKILL MATRIX</span>
            </button>
          </div>

          {/* Add Course Form */}
          {showAddCourse && (
            <form onSubmit={handleAddCourse} className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4 font-label text-xs">
              <span className="block font-bold text-sm uppercase text-[#1A1C1E] border-b border-[#6C7278]/25 pb-2">
                Configure New Skill Matrix
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-[#6C7278]">Course / Matrix Title</label>
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. History of Modern Architecture"
                    required
                    className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase text-[#6C7278]">Category (Skill Class)</label>
                  <input
                    type="text"
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="e.g. Design, Philosophy, Technology"
                    className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-[#6C7278]">Skill Roadmap Summary</label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2.5 py-1.5 focus:outline-none font-sans"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 bg-[#1A1C1E] text-white py-2 uppercase text-xs tracking-wider font-bold cursor-pointer">
                  Save Skill Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-2 border border-[#6C7278] text-[#1A1C1E] hover:bg-[#F7F5F2] uppercase text-xs tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Courses grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const progress = calculateCourseProgress(course.id);
              return (
                <div
                  key={course.id}
                  className="bg-white border border-[#6C7278]/40 p-5 flex flex-col justify-between space-y-6 rounded-sm relative group hover:border-[#1A1C1E] transition-all"
                >
                  <div className="space-y-2">
                    <span className="font-label text-xs bg-[#6C7278]/20 px-1.5 py-0.5 text-[#1A1C1E] uppercase tracking-wide">
                      {course.category}
                    </span>
                    <h4 className="font-display text-lg font-bold text-[#1A1C1E] tracking-tight line-clamp-1">
                      {course.title}
                    </h4>
                    {course.description && (
                      <p className="font-sans text-xs text-[#6C7278] line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[#6C7278]/20 pt-4 flex items-center justify-between">
                    <div>
                      <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider block">
                        Completion
                      </span>
                      <span className="font-display text-md font-semibold text-[#B8422E]">
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
                      className="border border-[#1A1C1E] hover:bg-[#1A1C1E] hover:text-white transition-all px-3 py-1.5 font-label text-xs uppercase tracking-widest font-bold cursor-pointer"
                    >
                      ENTER STUDIO
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setCourseToDelete({ id: course.id, title: course.title });
                      setDeleteModalOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[#6C7278] hover:text-[#B8422E] absolute right-4 top-4 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : academyTab === 'matrix' ? (
        /* ==========================================
            VIEW 2: SPLIT-SCREEN STUDY STUDIO
           ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
          
          {/* LEFT SIDE: HIERARCHICAL INDEX CHECKLIST */}
          <section className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-6 max-h-[600px] overflow-y-auto">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-2 border-b border-[#6C7278]/20 pb-1">
              Modules & Lessons Index
            </span>

            {/* Modules map */}
            <div className="space-y-6">
              {courseModules
                .filter((m) => m.course_id === selectedCourseId)
                .map((mod) => {
                  const modLessons = lessons.filter((l) => l.module_id === mod.id);
                  const isSelected = selectedModuleId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className={`p-4 border transition-all ${
                        isSelected ? 'border-[#1A1C1E] bg-[#F7F5F2]/40' : 'border-[#6C7278]/25 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-baseline mb-3">
                        <h5
                          onClick={() => setSelectedModuleId(mod.id)}
                          className="font-display text-md font-bold text-[#1A1C1E] hover:text-[#B8422E] cursor-pointer"
                        >
                          {mod.title}
                        </h5>
                        <span className="font-label text-xs text-[#6C7278] uppercase">
                          Module {mod.order_index}
                        </span>
                      </div>

                      {/* Lessons checklist */}
                      <div className="space-y-2 mb-4">
                        {modLessons.map((l) => (
                          <div key={l.id} className="flex items-center justify-between p-2 bg-white border border-[#6C7278]/15 rounded-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleLessonCompleted(l.id, !l.completed)}
                                className="text-[#6C7278] hover:text-[#B8422E] shrink-0 cursor-pointer"
                              >
                                {l.completed ? (
                                  <CheckSquare className="h-4 w-4 text-emerald-700" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                              <span className={`font-sans text-xs text-[#1A1C1E] ${l.completed ? 'line-through text-[#6C7278]' : ''}`}>
                                {l.title}
                              </span>
                            </div>

                            {l.link && (
                              <a
                                href={l.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#6C7278] hover:text-[#B8422E]"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Lesson Input */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-[#6C7278]/15 space-y-2 font-label text-xs">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newLessonName}
                              onChange={(e) => setNewLessonName(e.target.value)}
                              placeholder="Add Lesson Title..."
                              className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1"
                            />
                            <input
                              type="text"
                              value={newLessonLink}
                              onChange={(e) => setNewLessonLink(e.target.value)}
                              placeholder="Link (optional)..."
                              className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-2 py-1"
                            />
                            <button
                              onClick={() => handleAddLesson(mod.id)}
                              className="bg-[#1A1C1E] text-white px-3 py-1 font-bold uppercase tracking-wider cursor-pointer"
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

            {/* Add Module controller */}
            <div className="pt-4 border-t border-[#6C7278]/20 font-label text-xs">
              <span className="block text-xs uppercase text-[#6C7278] mb-2 font-bold">New Module</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Module name..."
                  className="flex-1 bg-[#F7F5F2] border border-[#6C7278]/40 px-3 py-1.5"
                />
                <button
                  onClick={() => handleAddModule(selectedCourseId)}
                  className="bg-[#1A1C1E] text-white px-4 py-1.5 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Create Module
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT SIDE: INTEGRATED MARKDOWN NOTES NOTEPAD */}
          <section className="bg-white border border-[#6C7278] p-6 rounded-sm flex flex-col justify-between min-h-[500px]">
            {activeModule ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-[#6C7278]/25 pb-2">
                  <div>
                    <span className="font-label text-xs text-[#6C7278] uppercase">Studio Notepad</span>
                    <h5 className="font-display text-md font-bold text-[#1A1C1E] truncate max-w-[200px]">
                      {activeModule.title}
                    </h5>
                  </div>

                  {/* Toggle Preview / Edit */}
                  <div className="flex border border-[#6C7278] font-label text-xs">
                    <button
                      onClick={() => setIsNotePreview(false)}
                      className={`px-2 py-1 flex items-center space-x-1 cursor-pointer ${!isNotePreview ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E]'}`}
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>EDIT</span>
                    </button>
                    <button
                      onClick={() => setIsNotePreview(true)}
                      className={`px-2 py-1 flex items-center space-x-1 border-l border-[#6C7278] cursor-pointer ${isNotePreview ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E]'}`}
                    >
                      <Eye className="h-3 w-3" />
                      <span>PREVIEW</span>
                    </button>
                  </div>
                </div>

                {/* Edit notepad area */}
                <div className="flex-1 mt-4">
                  {!isNotePreview ? (
                    <textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="# Markdown Notes here&#10;- Bullet point one&#10;- Bullet point two&#10;> An architectural quote"
                      className="w-full h-[350px] bg-[#F7F5F2]/45 border border-[#6C7278]/30 px-4 py-3 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-mono resize-none leading-relaxed"
                    />
                  ) : (
                    <div className="w-full h-[350px] bg-white border border-[#6C7278]/15 px-4 py-3 overflow-y-auto max-h-[350px] space-y-2 border-heritage rounded-sm">
                      {renderMarkdown(localNotes)}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#6C7278]/20 pt-3 flex justify-between items-center text-xs font-label text-[#6C7278]">
                  <span>{isSavingNotes ? 'Saving...' : 'Notes auto-saved to backend'}</span>
                  <span className="font-mono">Markdown syntax supported</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 flex-1 flex flex-col justify-center">
                <BookOpen className="h-10 w-10 text-[#6C7278]/40 mx-auto mb-2" />
                <p className="font-sans text-xs text-[#6C7278] italic">No active module selected. Select a module from index hierarchy.</p>
              </div>
            )}
          </section>

        </div>
      ) : (
        /* ==========================================
            VIEW 3: SPACED REPETITION (SRS) FLASHCARDS
           ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Flashcard Study Desk (Deck queue viewer) */}
          <section className="lg:col-span-2 bg-white border border-[#6C7278] p-6 rounded-sm flex flex-col justify-between min-h-[400px]">
            <div>
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-4 border-b border-[#6C7278]/20 pb-1">
                Leitner Review Station ({dueCards.length} cards due)
              </span>

              {activeCard ? (
                <div className="space-y-8 flex flex-col items-center py-8">
                  {/* Flip Card Container */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full max-w-md h-48 border border-[#6C7278] bg-[#F7F5F2] hover:border-[#B8422E] cursor-pointer flex flex-col justify-center p-6 relative transition-all duration-300"
                  >
                    <span className="absolute top-3 left-3 font-label text-xs text-[#6C7278] uppercase">
                      Box {activeCard.box} &bull; {isFlipped ? 'Answer' : 'Question'}
                    </span>

                    <p className="font-display text-md text-center text-[#1A1C1E] leading-relaxed font-semibold">
                      {isFlipped ? activeCard.back : activeCard.front}
                    </p>
                    
                    <span className="absolute bottom-3 right-3 font-label text-xs text-[#6C7278] uppercase tracking-wider">
                      Click Card to Flip
                    </span>
                  </div>

                  {/* Actions (Terracotta redReserved button) */}
                  {isFlipped && (
                    <div className="flex space-x-4 w-full max-w-sm font-label text-xs">
                      <button
                        onClick={async () => {
                          await reviewFlashcard(activeCard.id, true);
                          setIsFlipped(false);
                          setActiveFlashcardIndex(0);
                        }}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2 uppercase font-bold tracking-wider rounded-sm cursor-pointer"
                      >
                        Correct (Box +1)
                      </button>
                      <button
                        onClick={async () => {
                          await reviewFlashcard(activeCard.id, false);
                          setIsFlipped(false);
                          setActiveFlashcardIndex(0);
                        }}
                        className="flex-1 bg-[#B8422E] hover:bg-[#B8422E]/90 text-white py-2 uppercase font-bold tracking-wider rounded-sm cursor-pointer"
                      >
                        Incorrect (Box 1)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24">
                  <span className="font-display text-md italic text-[#6C7278] block">No cards due for review.</span>
                  <span className="font-sans text-xs text-[#6C7278] mt-1 block">Leitner box intervals satisfied. Add flashcards below.</span>
                </div>
              )}
            </div>

            {/* Deck queue list footer */}
            {dueCards.length > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-[#6C7278]/20 font-label text-xs">
                <button
                  disabled={activeFlashcardIndex === 0}
                  onClick={() => { setActiveFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
                  className="text-[#6C7278] disabled:opacity-30 uppercase cursor-pointer"
                >
                  &larr; Prev Card
                </button>
                <span className="text-[#6C7278]">Card {activeFlashcardIndex + 1} of {dueCards.length}</span>
                <button
                  disabled={activeFlashcardIndex === dueCards.length - 1}
                  onClick={() => { setActiveFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
                  className="text-[#6C7278] disabled:opacity-30 uppercase cursor-pointer"
                >
                  Next Card &rarr;
                </button>
              </div>
            )}
          </section>

          {/* Flashcard Add Panel */}
          <section className="bg-white border border-[#6C7278] p-6 rounded-sm self-start">
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-4">
              Add New Flashcard
            </span>

            <form onSubmit={handleAddFlashcardSubmit} className="space-y-4 font-label text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-[#6C7278]">Module Source</label>
                <select
                  value={selectedModuleId || ''}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  required
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 focus:outline-none"
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
                <label className="block text-xs uppercase text-[#6C7278]">Front Question</label>
                <textarea
                  value={fcQuestion}
                  onChange={(e) => setFcQuestion(e.target.value)}
                  rows={2}
                  placeholder="e.g. What is a Service Worker lifecycle?"
                  required
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-1.5 focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-[#6C7278]">Back Answer</label>
                <textarea
                  value={fcAnswer}
                  onChange={(e) => setFcAnswer(e.target.value)}
                  rows={2}
                  placeholder="e.g. Install, Activate, Idle, Fetch"
                  required
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-1.5 focus:outline-none font-sans"
                />
              </div>

              {/* Terracotta Action Button */}
              <button
                type="submit"
                disabled={!selectedModuleId || !fcQuestion || !fcAnswer}
                className="w-full btn-tertiary uppercase text-xs tracking-wider font-bold mt-2 cursor-pointer"
              >
                SAVE FLASHCARD
              </button>
            </form>
          </section>

        </div>
      )}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCourseToDelete(null);
        }}
        onConfirm={async () => {
          if (courseToDelete) {
            await deleteCourse(courseToDelete.id);
            showToast('Skill matrix deleted successfully.', 'info');
          }
        }}
        itemName={courseToDelete?.title || ''}
        itemType="skill matrix"
      />
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense fallback={
      <div className="bg-white border border-[#6C7278]/30 py-16 text-center rounded-sm">
        <p className="font-sans text-sm text-[#6C7278] italic">Loading Academy Studio...</p>
      </div>
    }>
      <AcademyContent />
    </Suspense>
  );
}
