'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDashboard, InboxItem } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { 
  Inbox, 
  Link2, 
  FileText, 
  Scissors, 
  MoreVertical, 
  FolderPlus, 
  GraduationCap, 
  Clock, 
  Archive, 
  Trash2, 
  ExternalLink,
  Search,
  Sparkles,
  GripVertical,
  BookOpen,
  Pencil,
  X,
  Plus,
  HelpCircle,
  Bookmark,
  CheckSquare,
  Zap,
  Quote,
  FileCode,
  Check,
  Tag,
  ArrowRight,
  PlusCircle,
  FileQuestion,
  ListTodo
} from 'lucide-react';

export default function InboxPage() {
  const {
    inboxItems,
    projects,
    courses,
    courseModules,
    loading,
    addInboxItem,
    updateInboxItemStatus,
    deleteInboxItem,
    updateInboxItem,
    addTask,
    addLesson,
    addFlashcard,
    addKnowledgeItem,
    addObjectLink,
    journalEntries,
    updateJournalEntry
  } = useDashboard();

  const { showToast } = useToast();

  // Selected slip state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Status Filter: unprocessed, processed, snoozed, archived
  const [statusFilter, setStatusFilter] = useState<'unprocessed' | 'processed' | 'snoozed' | 'archived'>('unprocessed');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  // Quick Capture form inside Inbox
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const [quickType, setQuickType] = useState<InboxItem['type']>('thought');
  const [quickUrl, setQuickUrl] = useState('');
  const [quickTags, setQuickTags] = useState('');

  // In-place edit form for selected item
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTags, setEditTags] = useState('');

  // Selected item active processing tab: 'task' | 'knowledge' | 'project' | 'journal' | 'flashcard' | 'snooze'
  const [activeActionTab, setActiveActionTab] = useState<'task' | 'knowledge' | 'project' | 'journal' | 'flashcard' | 'snooze'>('task');

  // Action fields
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskCategory, setTaskCategory] = useState<'Work' | 'Personal' | 'Urgent' | 'Learning' | 'Other'>('Work');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [knowledgeTopic, setKnowledgeTopic] = useState('');
  const [knowledgeSummary, setKnowledgeSummary] = useState('');
  const [knowledgeLinkProjectId, setKnowledgeLinkProjectId] = useState('');

  const [projectLinkId, setProjectLinkId] = useState('');

  const [journalDate, setJournalDate] = useState(getLocalDateString());
  const [journalReflectionType, setJournalReflectionType] = useState<'learned' | 'better' | 'free_text'>('learned');

  const [flashcardCourseId, setFlashcardCourseId] = useState('');
  const [flashcardModuleId, setFlashcardModuleId] = useState('');
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');

  const [snoozeDate, setSnoozeDate] = useState('');
  useEffect(() => {
    setSnoozeDate(getLocalDateString(new Date(Date.now() + 86400000)));
  }, []);

  // Setup defaults when item is selected
  const selectedItem = useMemo(() => {
    return inboxItems.find((item) => item.id === selectedItemId) || null;
  }, [inboxItems, selectedItemId]);

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title);
      setEditContent(selectedItem.content || '');
      setEditUrl(selectedItem.url || selectedItem.source_url || '');
      setEditTags((selectedItem.tags || []).map((t) => t.replace('#', '')).join(', '));
      setIsEditingSelected(false);

      // Default fields values
      setFlashcardFront(selectedItem.title);
      setFlashcardBack(selectedItem.content || '');
      setKnowledgeSummary(selectedItem.summary || selectedItem.content?.slice(0, 150) || '');
    }
  }, [selectedItem]);

  // Set default sub-selectors when project/course changes
  useEffect(() => {
    if (courses.length > 0 && !flashcardCourseId) {
      setFlashcardCourseId(courses[0].id);
    }
  }, [courses, flashcardCourseId]);

  const activeModules = useMemo(() => {
    return courseModules.filter((m) => m.course_id === flashcardCourseId);
  }, [courseModules, flashcardCourseId]);

  useEffect(() => {
    if (activeModules.length > 0) {
      setFlashcardModuleId(activeModules[0].id);
    } else {
      setFlashcardModuleId('');
    }
  }, [activeModules]);

  // Helper icons mapper for types
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thought': return <Sparkles className="h-4 w-4 text-secondary" />;
      case 'idea': return <Zap className="h-4 w-4 text-warning" />;
      case 'task': return <CheckSquare className="h-4 w-4 text-accent" />;
      case 'url': return <Link2 className="h-4 w-4 text-accent" />;
      case 'photo': return <Scissors className="h-4 w-4 text-primary" />;
      case 'quote': return <Quote className="h-4 w-4 text-[#58805F]" />;
      case 'code': return <FileCode className="h-4 w-4 text-[#8D6E63]" />;
      case 'question': return <HelpCircle className="h-4 w-4 text-danger" />;
      case 'journal': return <BookOpen className="h-4 w-4 text-primary" />;
      case 'book_note': return <Bookmark className="h-4 w-4 text-[#D1A153]" />;
      case 'course_note': return <GraduationCap className="h-4 w-4 text-accent" />;
      case 'decision': return <Check className="h-4 w-4 text-success" />;
      case 'resource': return <FileText className="h-4 w-4 text-secondary" />;
      default: return <FileText className="h-4 w-4 text-secondary" />;
    }
  };

  // Keyboard navigation inside list
  const filteredSlips = useMemo(() => {
    const list = inboxItems.filter((item) => {
      // Map old statuses to support backward compatibility
      let matchesStatus = false;
      if (statusFilter === 'unprocessed') {
        matchesStatus = item.status === 'unprocessed' || item.status === 'unsorted';
      } else if (statusFilter === 'processed') {
        matchesStatus = item.status === 'processed' || item.status === 'task' || item.status === 'academy' || item.status === 'knowledge';
      } else {
        matchesStatus = item.status === statusFilter;
      }
      return matchesStatus;
    });

    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)))
      );
    });
  }, [inboxItems, statusFilter, searchQuery]);

  // Select first item on desktop if nothing is selected or if selected item leaves the current filter list
  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    if (isDesktop && filteredSlips.length > 0) {
      if (!selectedItemId || !filteredSlips.some((i) => i.id === selectedItemId)) {
        setSelectedItemId(filteredSlips[0].id);
      }
    } else {
      // On mobile, only reset selection to null if the selected item actually left the list (e.g. processed/deleted)
      if (selectedItemId && !filteredSlips.some((i) => i.id === selectedItemId)) {
        setSelectedItemId(null);
      }
    }
  }, [filteredSlips, selectedItemId]);

  // Global Up/Down Arrow keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );
      if (isTyping) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const index = filteredSlips.findIndex((i) => i.id === selectedItemId);
        if (index !== -1 && index < filteredSlips.length - 1) {
          setSelectedItemId(filteredSlips[index + 1].id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const index = filteredSlips.findIndex((i) => i.id === selectedItemId);
        if (index > 0) {
          setSelectedItemId(filteredSlips[index - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSlips, selectedItemId]);

  // Submit edits
  const handleSaveSlipEdit = async () => {
    if (!selectedItem || !editTitle.trim()) return;

    const tagsArray = editTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    try {
      await updateInboxItem(selectedItem.id, {
        title: editTitle.trim(),
        content: editContent.trim() || undefined,
        url: editUrl.trim() || undefined,
        tags: tagsArray,
      });
      showToast('Slip details updated.', 'success');
      setIsEditingSelected(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update slip.', 'error');
    }
  };

  // Capture quick slip
  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      const tagsArray = quickTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      await addInboxItem(
        quickType,
        quickTitle.trim(),
        quickUrl.trim() || undefined,
        quickContent.trim() || undefined,
        tagsArray,
        'unprocessed'
      );

      showToast('Quick slip captured successfully.', 'success');
      setQuickTitle('');
      setQuickContent('');
      setQuickUrl('');
      setQuickTags('');
      setShowQuickCapture(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to capture quick slip.', 'error');
    }
  };

  // Convert to Task
  const handleConvertToTaskSubmit = async () => {
    if (!selectedItem) return;

    try {
      // Create task
      await addTask(
        taskProjectId || undefined,
        selectedItem.title,
        selectedItem.content || selectedItem.url || 'Imported from Capture Slip triage.',
        taskPriority,
        taskDueDate || undefined,
        'none',
        undefined,
        [],
        taskCategory,
        selectedItem.id
      );

      // Set status to processed
      await updateInboxItemStatus(selectedItem.id, 'processed', taskProjectId || undefined);
      showToast('✓ Task created & Slip marked processed.', 'success');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to convert to task.', 'error');
    }
  };

  // Create Knowledge Note
  const handleCreateKnowledgeSubmit = async () => {
    if (!selectedItem) return;

    try {
      // Add note
      const noteId = await addKnowledgeItem(
        selectedItem.title,
        selectedItem.content || '',
        selectedItem.type,
        selectedItem.url || selectedItem.source_url || undefined,
        knowledgeTopic || undefined,
        knowledgeSummary || undefined,
        selectedItem.id
      );

      // Link to project if selected
      if (knowledgeLinkProjectId) {
        await addObjectLink(
          'knowledge_item',
          noteId,
          'project',
          knowledgeLinkProjectId,
          'related_note'
        );
      }

      // Update status
      await updateInboxItemStatus(selectedItem.id, 'processed', knowledgeLinkProjectId || undefined);
      showToast('✓ Knowledge note created & Slip processed.', 'success');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to save knowledge note.', 'error');
    }
  };

  // Attach to Project
  const handleAttachProjectSubmit = async () => {
    if (!selectedItem || !projectLinkId) return;

    try {
      await addObjectLink(
        'inbox_item',
        selectedItem.id,
        'project',
        projectLinkId,
        'related_capture'
      );
      await updateInboxItemStatus(selectedItem.id, 'processed', projectLinkId);
      showToast('✓ Slip linked to project & processed.', 'success');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to link project.', 'error');
    }
  };

  // Add to Journal
  const handleAddToJournalSubmit = async () => {
    if (!selectedItem) return;

    try {
      const targetJournal = journalEntries.find((j) => j.date === journalDate);
      
      let morning = targetJournal?.morning_intentions || [];
      let learned = targetJournal?.evening_reflections_learned || [];
      let better = targetJournal?.evening_reflections_better || [];
      let freeText = targetJournal?.free_text || '';

      const contentText = `${selectedItem.title}${selectedItem.content ? `: ${selectedItem.content}` : ''}`;

      if (journalReflectionType === 'learned') {
        learned = [...learned, contentText].slice(0, 5); // Allow up to 5 reflections
      } else if (journalReflectionType === 'better') {
        better = [...better, contentText].slice(0, 5);
      } else {
        freeText = freeText ? `${freeText}\n\n${contentText}` : contentText;
      }

      await updateJournalEntry(
        journalDate,
        morning,
        learned,
        better,
        freeText
      );

      await updateInboxItemStatus(selectedItem.id, 'processed');
      showToast('✓ Slip logged to Journal & processed.', 'success');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to log reflection.', 'error');
    }
  };

  // Create Flashcard
  const handleCreateFlashcardSubmit = async () => {
    if (!selectedItem || !flashcardCourseId || !flashcardModuleId) return;

    try {
      await addFlashcard(
        flashcardCourseId,
        flashcardModuleId,
        flashcardFront.trim(),
        flashcardBack.trim()
      );

      await updateInboxItemStatus(selectedItem.id, 'processed');
      showToast('✓ Flashcard added & Slip processed.', 'success');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to create flashcard.', 'error');
    }
  };

  // Snooze
  const handleSnoozeSubmit = async () => {
    if (!selectedItem) return;

    try {
      await updateInboxItemStatus(selectedItem.id, 'snoozed', undefined, snoozeDate);
      showToast(`✓ Slip snoozed until ${snoozeDate}.`, 'info');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to snooze slip.', 'error');
    }
  };

  // Archive
  const handleArchiveClick = async () => {
    if (!selectedItem) return;
    try {
      await updateInboxItemStatus(selectedItem.id, 'archived');
      showToast('✓ Slip archived.', 'info');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to archive.', 'error');
    }
  };

  // Delete confirm
  const handleDeleteClick = () => {
    if (!selectedItem) return;
    setItemToDelete({ id: selectedItem.id, title: selectedItem.title });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteInboxItem(itemToDelete.id);
      showToast('Capture slip deleted.', 'info');
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete slip.', 'error');
    }
  };

  const renderPanelContent = (isMobile: boolean = false) => {
    if (!selectedItem) {
      return (
        <div className="py-20 text-center space-y-3">
          <Inbox className="h-10 w-10 text-secondary/30 mx-auto" />
          <h5 className="font-display text-md font-bold uppercase tracking-wider text-secondary">No Slip Selected</h5>
          <p className="font-sans text-xs text-secondary/80 max-w-xs mx-auto leading-relaxed">
            Choose a captured thought, link, or note from the Intake Queue to start triaging it into permanent output.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header Close button only on mobile */}
        {isMobile && (
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="font-label text-xs uppercase font-bold text-accent">Triage Capture Slip</span>
            <button 
              type="button"
              onClick={() => setSelectedItemId(null)} 
              className="text-secondary hover:text-primary p-1 btn-press cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* Slip Card Details Header */}
        <div className="border-b border-border pb-4 space-y-4">
          <div className="flex justify-between items-center font-label text-[10px] text-secondary">
            <span className="uppercase font-bold tracking-widest text-accent">Intake Card Details</span>
            <span className="uppercase">{new Date(selectedItem.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
          </div>

          {!isEditingSelected ? (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-bold text-primary leading-tight">
                {selectedItem.title}
              </h3>
              {selectedItem.content && (
                <div className="bg-neutral-bg/40 border border-border p-3 font-sans text-xs text-primary leading-relaxed whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              )}
              {(selectedItem.url || selectedItem.source_url) && (
                <div className="flex items-center space-x-2 text-xs font-label uppercase">
                  <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <a 
                    href={selectedItem.url || selectedItem.source_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-accent underline hover:opacity-80 shrink-1 truncate"
                  >
                    {selectedItem.url || selectedItem.source_url}
                  </a>
                </div>
              )}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedItem.tags.map((tag) => (
                    <span key={tag} className="font-label text-[9px] border border-secondary/20 bg-neutral-bg/40 text-secondary px-2 py-0.5 uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingSelected(true)}
                  className="btn-press border border-border hover:border-primary px-3 py-1.5 font-label text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer bg-surface text-primary"
                >
                  <Pencil className="h-3 w-3 text-secondary" />
                  <span>Edit Slip</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-label text-xs uppercase">
              <div className="space-y-1">
                <label className="block text-[10px] text-secondary font-bold">Edit Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-neutral-bg border border-border px-3 py-2 text-xs focus:outline-none font-sans"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-secondary font-bold">Edit Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-bg border border-border px-3 py-2 text-xs focus:outline-none font-sans resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-secondary font-bold">Edit URL</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-neutral-bg border border-border px-3 py-2 text-xs focus:outline-none font-sans"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-secondary font-bold">Edit Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-neutral-bg border border-border px-3 py-2 text-xs focus:outline-none font-sans"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <SecondaryButton type="button" onClick={() => setIsEditingSelected(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" onClick={handleSaveSlipEdit}>
                  Save Slip
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>

        {/* Triage Action Panel Section */}
        <div className="space-y-4">
          <span className="block font-label text-[10px] uppercase tracking-widest text-secondary font-bold border-b border-border pb-2">
            Triage Tactic
          </span>

          {/* Sub Action Tabs */}
          <div className="grid grid-cols-3 md:grid-cols-6 border border-border font-label text-[8px] uppercase tracking-wider font-bold">
            {[
              { key: 'task', label: 'Task' },
              { key: 'knowledge', label: 'Note' },
              { key: 'project', label: 'Link' },
              { key: 'journal', label: 'Journal' },
              { key: 'flashcard', label: 'Card' },
              { key: 'snooze', label: 'Snooze' },
            ].map((tab) => {
              const isActive = activeActionTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setActiveActionTab(tab.key as any)}
                  className={`py-2 text-center border-r last:border-r-0 border-border cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-primary text-on-primary' 
                      : 'hover:bg-neutral-bg text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action Panels */}
          <div className="bg-neutral-bg/30 border border-border p-4 font-label text-xs uppercase space-y-4">
            
            {/* PANEL 1: CONVERT TO TASK */}
            {activeActionTab === 'task' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">File Actionable Task</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Target Project</label>
                  <select
                    value={taskProjectId}
                    onChange={(e) => setTaskProjectId(e.target.value)}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                  >
                    <option value="">No Project (Standalone)</option>
                    {projects.filter(p => !p.is_archived).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Category</label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value as any)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                    >
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Learning">Learning</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans"
                  />
                </div>
                <PrimaryButton type="button" onClick={handleConvertToTaskSubmit} className="w-full mt-2">
                  Execute Conversion & Complete
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 2: CREATE KNOWLEDGE NOTE */}
            {activeActionTab === 'knowledge' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">File Knowledge Note</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Topic / Category</label>
                  <input
                    type="text"
                    value={knowledgeTopic}
                    onChange={(e) => setKnowledgeTopic(e.target.value)}
                    placeholder="e.g. Design Systems, React"
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Summary Synthesis</label>
                  <textarea
                    value={knowledgeSummary}
                    onChange={(e) => setKnowledgeSummary(e.target.value)}
                    placeholder="Synthesize the core insight in one sentence..."
                    rows={2}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Link to Project (Optional)</label>
                  <select
                    value={knowledgeLinkProjectId}
                    onChange={(e) => setKnowledgeLinkProjectId(e.target.value)}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                  >
                    <option value="">No Project Link</option>
                    {projects.filter(p => !p.is_archived).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <PrimaryButton type="button" onClick={handleCreateKnowledgeSubmit} className="w-full mt-2">
                  File to Note Ledger
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 3: LINK TO PROJECT */}
            {activeActionTab === 'project' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">Link Intake directly to Sector Project</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Target Project</label>
                  <select
                    value={projectLinkId}
                    onChange={(e) => setProjectLinkId(e.target.value)}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                  >
                    <option value="">Select Project...</option>
                    {projects.filter(p => !p.is_archived).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <p className="font-sans text-[10px] text-secondary leading-normal lowercase normal-case">
                  This links the raw inbox slip directly as a related capture reference inside the project's detail command center.
                </p>
                <PrimaryButton 
                  type="button"
                  onClick={handleAttachProjectSubmit} 
                  disabled={!projectLinkId}
                  className="w-full mt-2"
                >
                  Create Reference Connection
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 4: ADD TO JOURNAL */}
            {activeActionTab === 'journal' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">Log Reflection slip to Journal</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Target Date</label>
                    <input
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Reflection Slot</label>
                    <select
                      value={journalReflectionType}
                      onChange={(e) => setJournalReflectionType(e.target.value as any)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                    >
                      <option value="learned">What I Learned</option>
                      <option value="better">What to Improve</option>
                      <option value="free_text">Free Text Entry</option>
                    </select>
                  </div>
                </div>
                <PrimaryButton type="button" onClick={handleAddToJournalSubmit} className="w-full mt-2">
                  Append Reflection & File
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 5: CREATE FLASHCARD */}
            {activeActionTab === 'flashcard' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">Create Flashcard</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Course</label>
                    <select
                      value={flashcardCourseId}
                      onChange={(e) => setFlashcardCourseId(e.target.value)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                      {courses.length === 0 && <option value="">No courses available</option>}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Module</label>
                    <select
                      value={flashcardModuleId}
                      onChange={(e) => setFlashcardModuleId(e.target.value)}
                      className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans cursor-pointer"
                      disabled={activeModules.length === 0}
                    >
                      {activeModules.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                      {activeModules.length === 0 && <option value="">No modules</option>}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Front Face</label>
                  <input
                    type="text"
                    value={flashcardFront}
                    onChange={(e) => setFlashcardFront(e.target.value)}
                    placeholder="Question / term..."
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Back Face</label>
                  <textarea
                    value={flashcardBack}
                    onChange={(e) => setFlashcardBack(e.target.value)}
                    placeholder="Explanation / formula / answer..."
                    rows={2}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans resize-none"
                  />
                </div>
                <PrimaryButton 
                  type="button"
                  onClick={handleCreateFlashcardSubmit} 
                  disabled={!flashcardCourseId || !flashcardModuleId || !flashcardFront.trim()}
                  className="w-full mt-2"
                >
                  Add to Review Deck
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 6: SNOOZE SLIP */}
            {activeActionTab === 'snooze' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">Snooze Intake Slip</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Wake Up Date</label>
                  <input
                    type="date"
                    value={snoozeDate}
                    onChange={(e) => setSnoozeDate(e.target.value)}
                    className="w-full bg-surface border border-border px-2.5 py-2 text-xs focus:outline-none font-sans"
                  />
                </div>
                <p className="font-sans text-[10px] text-secondary leading-normal lowercase normal-case">
                  Snoozing hides this slip from the unprocessed queue until the selected date, where it will reappear at midnight.
                </p>
                <PrimaryButton type="button" onClick={handleSnoozeSubmit} className="w-full mt-2">
                  Apply Snooze Duration
                </PrimaryButton>
              </div>
            )}

          </div>
        </div>

        {/* Fast general actions (Archive, Delete) */}
        <div className="flex gap-2 justify-end border-t border-border pt-4 font-label text-xs uppercase tracking-wider font-bold">
          <button
            type="button"
            onClick={handleArchiveClick}
            className="px-3.5 py-2 border border-border hover:bg-neutral-bg/60 text-primary transition-colors flex items-center space-x-1.5 cursor-pointer btn-press rounded-none"
            title="Archive Slip"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Archive</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="px-3.5 py-2 border border-danger/40 text-danger hover:bg-danger/5 transition-colors flex items-center space-x-1.5 cursor-pointer btn-press rounded-none"
            title="Delete Slip"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>

      </div>
    );
  };

  return (
    <PageShell>
      <SectionHeader
        title="Processing Desk"
        subtitle="Capture Engine 2.0 • Intake Queue & Triage Channel"
        action={
          <button
            onClick={() => setShowQuickCapture(!showQuickCapture)}
            className="btn-press border border-primary px-4 py-2 font-label text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 bg-surface text-primary"
          >
            <PlusCircle className="h-4 w-4 text-accent" />
            <span>Quick Slip</span>
          </button>
        }
      />

      {/* Quick Capture Form Drawer */}
      {showQuickCapture && (
        <form onSubmit={handleQuickCaptureSubmit} className="bg-surface border border-primary p-6 space-y-4 font-label text-xs animate-modal">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="font-bold uppercase text-accent">File Quick Slip</span>
            <button type="button" onClick={() => setShowQuickCapture(false)} className="text-secondary hover:text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block uppercase text-[10px] text-secondary font-bold">Title</label>
              <input
                type="text"
                required
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Core keyword..."
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block uppercase text-[10px] text-secondary font-bold">Category</label>
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value as InboxItem['type'])}
                className="w-full bg-surface border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-accent font-sans rounded-none cursor-pointer"
              >
                <option value="thought">Thought</option>
                <option value="idea">Idea</option>
                <option value="task">Task</option>
                <option value="url">Link / URL</option>
                <option value="quote">Quote</option>
                <option value="code">Code Snippet</option>
                <option value="question">Question</option>
                <option value="journal">Journal Slip</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block uppercase text-[10px] text-secondary font-bold">URL / Reference Link</label>
              <input
                type="text"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block uppercase text-[10px] text-secondary font-bold">Content Notes</label>
              <textarea
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                placeholder="Content details, notes, quotes..."
                rows={3}
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none resize-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block uppercase text-[10px] text-secondary font-bold">Tags (comma separated)</label>
              <input
                type="text"
                value={quickTags}
                onChange={(e) => setQuickTags(e.target.value)}
                placeholder="ideas, health, work"
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <SecondaryButton type="button" onClick={() => setShowQuickCapture(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">
              File to Intake
            </PrimaryButton>
          </div>
        </form>
      )}

      {/* Main 3-Column Desk Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* ====================================================
            COLUMN 1: FILTERS (Span 3 on md, Span 2 on lg)
           ==================================================== */}
        <div className="space-y-6 font-label text-xs uppercase tracking-wider font-bold md:col-span-3 lg:col-span-2">
          <div className="bg-surface border border-border p-4 space-y-4">
            <span className="block text-secondary border-b border-border pb-2">Desk Channels</span>
            <div className="space-y-1.5">
              {[
                { key: 'unprocessed', label: 'Intake Queue', icon: Inbox },
                { key: 'processed', label: 'Processed Archive', icon: Check },
                { key: 'snoozed', label: 'Snoozed Ledger', icon: Clock },
                { key: 'archived', label: 'General Archives', icon: Archive },
              ].map((tab) => {
                const isActive = statusFilter === tab.key;
                const Icon = tab.icon;
                const count = inboxItems.filter((item) => {
                  if (tab.key === 'unprocessed') return item.status === 'unprocessed' || item.status === 'unsorted';
                  if (tab.key === 'processed') return item.status === 'processed' || item.status === 'task' || item.status === 'academy' || item.status === 'knowledge';
                  return item.status === tab.key;
                }).length;

                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setStatusFilter(tab.key as any);
                      setSelectedItemId(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-none flex items-center justify-between transition-colors cursor-pointer btn-press ${
                      isActive 
                        ? 'bg-primary text-on-primary border-l-2 border-accent' 
                        : 'text-primary hover:bg-neutral-bg border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Slip */}
          <div className="bg-surface border border-border p-4 space-y-3">
            <span className="block text-secondary border-b border-border pb-2">Filter Slips</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary/60">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH LEAKY SLIPS..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-bg border border-border text-sm focus:outline-none focus:border-accent font-sans placeholder:text-secondary/50 font-normal uppercase"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="w-full py-1 text-center border border-dashed border-border text-[9px] hover:border-primary transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        </div>

        {/* ====================================================
            COLUMN 2: SLIP QUEUE LIST (Span 4)
           ==================================================== */}
        <div className="md:col-span-4 lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center font-label text-[10px] uppercase tracking-wider text-secondary border-b border-border pb-2 px-1">
            <span>Intake Slips ({filteredSlips.length})</span>
            <span>Use Arrow Keys to Navigate</span>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredSlips.length > 0 ? (
              filteredSlips.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`border p-4 rounded-none space-y-2 relative transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-surface shadow-md ring-1 ring-primary'
                        : 'border-border bg-neutral-bg/40 hover:border-secondary hover:bg-neutral-bg/75'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(item.type)}
                        <span className="font-label text-[9px] uppercase tracking-wider text-secondary font-bold">
                          {item.type}
                        </span>
                      </div>
                      <span className="font-label text-[8px] text-secondary">
                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="font-sans text-xs font-semibold text-primary line-clamp-1">
                      {item.title}
                    </h4>

                    {item.content && (
                      <p className="font-sans text-[11px] text-secondary line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="font-label text-[8px] border border-secondary/20 bg-neutral-bg/30 text-secondary px-1.5 py-0.5 uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="border border-border border-dashed py-16 text-center bg-surface/20">
                <Inbox className="h-8 w-8 text-secondary/35 mx-auto mb-2" />
                <p className="font-sans text-xs text-secondary italic">No slips match your selection.</p>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            COLUMN 3: PROCESSING DESK PANEL (Span 5 on md, Span 6 on lg)
           ==================================================== */}
        <div className="hidden md:block md:col-span-5 lg:col-span-6 bg-surface border border-primary p-6 space-y-6 self-start shadow-sm">
          {renderPanelContent(false)}
        </div>

      </div>

      {/* Mobile Details Pop-up Modal overlay */}
      {selectedItem && (
        <div className="md:hidden fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 space-y-6 shadow-lg animate-modal rounded-none">
            {renderPanelContent(true)}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.title || ''}
        itemType="Intake Slip"
      />
    </PageShell>
  );
}
