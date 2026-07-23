'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard, InboxItem } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/utils/supabaseClient';
import { INTAKE_IMAGES_BUCKET, isExternalAttachmentUrl } from '@/utils/storage';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
import { smartSearchMatch } from '@/utils/searchUtils';
import PageShell from '@/components/ui/PageShell';
import SectionHeader from '@/components/ui/SectionHeader';
import EditorialCard from '@/components/ui/EditorialCard';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton, SecondaryButton, IconButton } from '@/components/ui/Buttons';
import { Input, Select, Textarea } from '@/components/ui/Inputs';
import { 
  Inbox, 
  Link2, 
  FileText, 
  Scissors, 
  GraduationCap, 
  Clock, 
  Archive, 
  Trash2, 
  Search,
  Sparkles,
  BookOpen,
  Pencil,
  X,
  HelpCircle,
  Bookmark,
  CheckSquare,
  Zap,
  Quote,
  FileCode,
  Check,
  ArrowRight,
  PlusCircle,
  RotateCcw,
  SlidersHorizontal,
  Tag
} from 'lucide-react';

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="app-panel-subtle py-20 text-center text-secondary font-label uppercase tracking-widest text-xs">Loading Inbox Triage...</div>}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const {
    inboxItems,
    projects,
    courses,
    courseModules,
    addInboxItem,
    updateInboxItemStatus,
    deleteInboxItem,
    updateInboxItem,
    autoTagItem,
    autoTagAllItems,
    addTask,
    addFlashcard,
    addKnowledgeItem,
    addObjectLink,
    journalEntries,
    updateJournalEntry
  } = useDashboard();

  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Selected slip state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Status Filter: unprocessed, processed, snoozed, archived
  const [statusFilter, setStatusFilter] = useState<'unprocessed' | 'processed' | 'snoozed' | 'archived'>('unprocessed');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | InboxItem['type']>('All');
  const [signalFilter, setSignalFilter] = useState<'all' | 'tagged' | 'with_url' | 'with_content'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'type'>('newest');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isAutoTaggingCurrent, setIsAutoTaggingCurrent] = useState(false);
  const [isAutoTaggingAll, setIsAutoTaggingAll] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search bar with '/' keyboard shortcut and clear with 'Esc'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && activeEl === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load itemId query param if present
  useEffect(() => {
    const itemId = searchParams ? searchParams.get('itemId') : null;
    if (itemId) {
      const item = inboxItems.find((i) => i.id === itemId);
      if (item) {
        setSelectedItemId(itemId);
        // Auto-adjust statusFilter to match item status
        let targetStatus: typeof statusFilter = 'unprocessed';
        if (item.status === 'processed' || item.status === 'task' || item.status === 'academy' || item.status === 'knowledge') {
          targetStatus = 'processed';
        } else if (item.status === 'snoozed') {
          targetStatus = 'snoozed';
        } else if (item.status === 'archived') {
          targetStatus = 'archived';
        }
        setStatusFilter(targetStatus);
      }
    }
  }, [searchParams, inboxItems]);

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
  const [selectedAttachmentPreviewUrl, setSelectedAttachmentPreviewUrl] = useState('');

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

  useEffect(() => {
    let isActive = true;

    const resolveAttachmentPreview = async () => {
      if (!selectedItem?.attachment_url) {
        setSelectedAttachmentPreviewUrl('');
        return;
      }

      if (isExternalAttachmentUrl(selectedItem.attachment_url)) {
        setSelectedAttachmentPreviewUrl(selectedItem.attachment_url);
        return;
      }

      const { data, error } = await supabase.storage
        .from(INTAKE_IMAGES_BUCKET)
        .createSignedUrl(selectedItem.attachment_url, 3600);

      if (!isActive) return;

      if (error) {
        console.error('Failed to resolve attachment preview:', error);
        setSelectedAttachmentPreviewUrl('');
        return;
      }

      setSelectedAttachmentPreviewUrl(data.signedUrl);
    };

    void resolveAttachmentPreview();

    return () => {
      isActive = false;
    };
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

  // Helper badge component for item types
  const getTypeBadge = (type: string) => {
    let icon = <FileText className="h-3.5 w-3.5" />;
    let style = 'bg-neutral-bg/60 text-secondary border-border';
    
    switch (type) {
      case 'thought':
        icon = <Sparkles className="h-3.5 w-3.5 text-purple-400" />;
        style = 'bg-purple-500/10 text-purple-300 border-purple-500/20';
        break;
      case 'idea':
        icon = <Zap className="h-3.5 w-3.5 text-amber-400" />;
        style = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
        break;
      case 'task':
        icon = <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />;
        style = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        break;
      case 'url':
        icon = <Link2 className="h-3.5 w-3.5 text-indigo-400" />;
        style = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
        break;
      case 'quote':
        icon = <Quote className="h-3.5 w-3.5 text-teal-400" />;
        style = 'bg-teal-500/10 text-teal-300 border-teal-500/20';
        break;
      case 'code':
        icon = <FileCode className="h-3.5 w-3.5 text-amber-600" />;
        style = 'bg-amber-700/10 text-amber-300 border-amber-700/20';
        break;
      case 'question':
        icon = <HelpCircle className="h-3.5 w-3.5 text-rose-400" />;
        style = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
        break;
      case 'journal':
        icon = <BookOpen className="h-3.5 w-3.5 text-sky-400" />;
        style = 'bg-sky-500/10 text-sky-300 border-sky-500/20';
        break;
      case 'book_note':
      case 'course_note':
        icon = <Bookmark className="h-3.5 w-3.5 text-yellow-400" />;
        style = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
        break;
      case 'decision':
        icon = <Check className="h-3.5 w-3.5 text-green-400" />;
        style = 'bg-green-500/10 text-green-300 border-green-500/20';
        break;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-label text-[9px] uppercase tracking-wider font-bold ${style}`}>
        {icon}
        <span>{type.replace('_', ' ')}</span>
      </span>
    );
  };

  const inboxTypes = useMemo(() => {
    return Array.from(new Set(inboxItems.map((item) => item.type))).sort();
  }, [inboxItems]);

  // Unique tag counts across all items
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inboxItems.forEach((item) => {
      (item.tags || []).forEach((t) => {
        const tag = t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`;
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [inboxItems]);

  const sortedTags = useMemo(() => {
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [tagCounts]);

  const handleAutoTagCurrentItem = async () => {
    if (!selectedItem) return;
    setIsAutoTaggingCurrent(true);
    try {
      const newTags = await autoTagItem(selectedItem.id);
      showToast(newTags.length > 0 ? `Tagged with ${newTags.join(', ')}` : 'No new tags generated.', 'success');
    } catch (err) {
      console.error(err);
      showToast('AI tagging failed.', 'error');
    } finally {
      setIsAutoTaggingCurrent(false);
    }
  };

  const handleAutoTagAllInbox = async () => {
    setIsAutoTaggingAll(true);
    try {
      const count = await autoTagAllItems(false);
      showToast(`AI tagging completed for ${count} inbox items.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Batch tagging encountered an error.', 'error');
    } finally {
      setIsAutoTaggingAll(false);
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
      if (!matchesStatus) return false;
      if (typeFilter !== 'All' && item.type !== typeFilter) return false;
      if (signalFilter === 'tagged' && (!item.tags || item.tags.length === 0)) return false;
      if (signalFilter === 'with_url' && !(item.url || item.source_url)) return false;
      if (signalFilter === 'with_content' && !item.content?.trim()) return false;
      return true;
    });

    const searchedList = list.filter((item) =>
      smartSearchMatch(
        [item.title, item.content, item.summary, item.url, item.source_url, item.type, item.tags],
        searchQuery
      )
    );

    return [...searchedList].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'type') return a.type.localeCompare(b.type) || b.created_at.localeCompare(a.created_at);
      if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [inboxItems, statusFilter, searchQuery, typeFilter, signalFilter, sortBy]);

  const statusCounts = useMemo(() => {
    return {
      unprocessed: inboxItems.filter((item) => item.status === 'unprocessed' || item.status === 'unsorted').length,
      processed: inboxItems.filter((item) => item.status === 'processed' || item.status === 'task' || item.status === 'academy' || item.status === 'knowledge').length,
      snoozed: inboxItems.filter((item) => item.status === 'snoozed').length,
      archived: inboxItems.filter((item) => item.status === 'archived').length,
    };
  }, [inboxItems]);

  const capturedToday = inboxItems.filter((item) => item.created_at?.split('T')[0] === getLocalDateString()).length;
  const hasSearch = searchQuery.trim().length > 0;
  const activeRefinementCount = [typeFilter !== 'All', signalFilter !== 'all', hasSearch, sortBy !== 'newest']
    .filter(Boolean)
    .length;
  const activeFilterCount = [typeFilter !== 'All', signalFilter !== 'all', sortBy !== 'newest'].filter(Boolean).length;
  const activeFilterLabels = [
    typeFilter !== 'All' ? `Type: ${typeFilter}` : null,
    signalFilter !== 'all' ? `Signal: ${signalFilter.replace('_', ' ')}` : null,
    sortBy !== 'newest' ? `Sort: ${sortBy.replace('_', ' ')}` : null
  ].filter(Boolean) as string[];

  const resetTriageControls = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setSignalFilter('all');
    setSortBy('newest');
  };

  const channelTabs = [
    { key: 'unprocessed' as const, label: 'Intake', icon: Inbox, count: statusCounts.unprocessed },
    { key: 'processed' as const, label: 'Processed', icon: Check, count: statusCounts.processed },
    { key: 'snoozed' as const, label: 'Snoozed', icon: Clock, count: statusCounts.snoozed },
    { key: 'archived' as const, label: 'Archive', icon: Archive, count: statusCounts.archived },
  ];
  const quickTypeOptions = [
    { value: 'thought', label: 'Thought' },
    { value: 'idea', label: 'Idea' },
    { value: 'task', label: 'Task' },
    { value: 'url', label: 'Link / URL' },
    { value: 'quote', label: 'Quote' },
    { value: 'code', label: 'Code Snippet' },
    { value: 'question', label: 'Question' },
    { value: 'journal', label: 'Journal Slip' }
  ];
  const activeProjectOptions = [
    { value: '', label: 'No Project (Standalone)' },
    ...projects.filter((p) => !p.is_archived).map((p) => ({ value: p.id, label: p.name }))
  ];
  const linkProjectOptions = [
    { value: '', label: 'No Project Link' },
    ...projects.filter((p) => !p.is_archived).map((p) => ({ value: p.id, label: p.name }))
  ];
  const attachProjectOptions = [
    { value: '', label: 'Select Project...' },
    ...projects.filter((p) => !p.is_archived).map((p) => ({ value: p.id, label: p.name }))
  ];
  const inboxTypeOptions = [
    { value: 'All', label: 'All types' },
    ...inboxTypes.map((type) => ({ value: type, label: type }))
  ];
  const signalOptions = [
    { value: 'all', label: 'All slips' },
    { value: 'tagged', label: 'Tagged' },
    { value: 'with_url', label: 'With URL' },
    { value: 'with_content', label: 'With notes' }
  ];
  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'type', label: 'Type' }
  ];
  const taskCategoryOptions = [
    { value: 'Work', label: 'Work' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Learning', label: 'Learning' },
    { value: 'Urgent', label: 'Urgent' },
    { value: 'Other', label: 'Other' }
  ];
  const taskPriorityOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];
  const reflectionOptions = [
    { value: 'learned', label: 'What I Learned' },
    { value: 'better', label: 'What to Improve' },
    { value: 'free_text', label: 'Free Text Entry' }
  ];

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
        <EmptyState
          title="No slip selected."
          description="Choose a captured thought, link, or note to triage it into a durable output."
        />
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
                <div className="app-panel-subtle px-4 py-3 font-sans text-xs text-primary leading-relaxed whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              )}
              {selectedAttachmentPreviewUrl && (
                <div className="app-panel-subtle p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedAttachmentPreviewUrl}
                    alt={selectedItem.title}
                    className="max-h-72 w-full object-contain bg-surface"
                  />
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
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="font-label text-[9px] uppercase tracking-wider text-secondary/70 font-bold mr-1">Tags:</span>
                  {selectedItem.tags && selectedItem.tags.length > 0 ? (
                    selectedItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-label text-[9px] border border-accent/30 bg-accent/10 text-accent px-2.5 py-0.5 uppercase rounded-md font-bold"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="font-label text-[9px] italic text-secondary">No tags set</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAutoTagCurrentItem}
                  disabled={isAutoTaggingCurrent}
                  className="font-label text-[9px] uppercase font-bold text-accent border border-accent/40 bg-accent/5 hover:bg-accent/15 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate or refresh tags using Gemini AI"
                >
                  <Sparkles className={`h-3 w-3 ${isAutoTaggingCurrent ? 'animate-spin' : ''}`} />
                  <span>{isAutoTaggingCurrent ? 'Tagging...' : 'Auto-Tag with AI'}</span>
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <SecondaryButton type="button" onClick={() => setIsEditingSelected(true)} className="min-h-9 px-3 py-2 text-[10px]">
                  <Pencil className="h-3 w-3 text-secondary" />
                  <span>Edit Slip</span>
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-label text-xs uppercase">
              <Input label="Edit Title" type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-neutral-bg text-sm" />
              <Textarea label="Edit Content" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="resize-none bg-neutral-bg text-sm min-h-[132px]" />
              <Input label="Edit URL" type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="bg-neutral-bg text-sm" />
              <div className="space-y-1">
                <Input label="Edit Tags (comma separated)" type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} className="bg-neutral-bg text-sm" />
                {sortedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[9px] text-secondary font-bold mr-1">Suggestions:</span>
                    {sortedTags.slice(0, 8).map(({ tag }) => {
                      const cleanTag = tag.replace('#', '');
                      const currentTags = editTags.split(',').map((t) => t.trim().replace('#', '').toLowerCase());
                      const hasTag = currentTags.includes(cleanTag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            let newTagsArray = editTags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean);
                            if (hasTag) {
                              newTagsArray = newTagsArray.filter((t) => t.replace('#', '').toLowerCase() !== cleanTag.toLowerCase());
                            } else {
                              newTagsArray.push(cleanTag);
                            }
                            setEditTags(newTagsArray.join(', '));
                          }}
                          className={`font-label text-[8px] px-1.5 py-0.5 uppercase border rounded cursor-pointer ${
                            hasTag ? 'border-accent bg-accent/20 text-accent font-bold' : 'border-border bg-neutral-bg text-secondary hover:border-secondary'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
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
          <div className="grid grid-cols-3 md:grid-cols-6 border border-border font-label text-[8px] uppercase tracking-wider font-bold rounded-2xl overflow-hidden bg-neutral-bg">
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
                      : 'hover:bg-surface-muted text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action Panels */}
          <div className="app-panel-subtle p-4 font-label text-xs uppercase space-y-4">
            
            {/* PANEL 1: CONVERT TO TASK */}
            {activeActionTab === 'task' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">File Actionable Task</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Target Project</label>
                  <Select value={taskProjectId} onChange={(e) => setTaskProjectId(e.target.value)} className="bg-neutral-bg text-sm" options={activeProjectOptions} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Category</label>
                    <Select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value as any)} className="bg-neutral-bg text-sm" options={taskCategoryOptions} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Priority</label>
                    <Select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)} className="bg-neutral-bg text-sm" options={taskPriorityOptions} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Due Date (Optional)</label>
                  <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="bg-neutral-bg text-sm" />
                </div>
                <PrimaryButton type="button" onClick={handleConvertToTaskSubmit} className="w-full mt-2">
                  Create Task
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 2: CREATE KNOWLEDGE NOTE */}
            {activeActionTab === 'knowledge' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">File Knowledge Note</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Topic / Category</label>
                  <Input type="text" value={knowledgeTopic} onChange={(e) => setKnowledgeTopic(e.target.value)} placeholder="e.g. Design Systems, React" className="bg-neutral-bg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Summary Synthesis</label>
                  <Textarea value={knowledgeSummary} onChange={(e) => setKnowledgeSummary(e.target.value)} placeholder="Synthesize the core insight in one sentence..." rows={2} className="resize-none bg-neutral-bg text-sm min-h-[96px]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Link to Project (Optional)</label>
                  <Select value={knowledgeLinkProjectId} onChange={(e) => setKnowledgeLinkProjectId(e.target.value)} className="bg-neutral-bg text-sm" options={linkProjectOptions} />
                </div>
                <PrimaryButton type="button" onClick={handleCreateKnowledgeSubmit} className="w-full mt-2">
                  Save Note
                </PrimaryButton>
              </div>
            )}

            {/* PANEL 3: LINK TO PROJECT */}
            {activeActionTab === 'project' && (
              <div className="space-y-3">
                <span className="block text-[10px] text-secondary font-bold">Link Intake directly to Sector Project</span>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Target Project</label>
                  <Select value={projectLinkId} onChange={(e) => setProjectLinkId(e.target.value)} className="bg-neutral-bg text-sm" options={attachProjectOptions} />
                </div>
                <p className="font-sans text-[10px] text-secondary leading-normal lowercase normal-case">
                  Link this slip as supporting context inside the selected project.
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
                    <Input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} className="bg-neutral-bg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Reflection Slot</label>
                    <Select value={journalReflectionType} onChange={(e) => setJournalReflectionType(e.target.value as any)} className="bg-neutral-bg text-sm" options={reflectionOptions} />
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
                    <Select
                      value={flashcardCourseId}
                      onChange={(e) => setFlashcardCourseId(e.target.value)}
                      className="bg-neutral-bg text-sm"
                      options={courses.length > 0 ? courses.map((c) => ({ value: c.id, label: c.title })) : [{ value: '', label: 'No courses available' }]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] text-secondary font-bold">Module</label>
                    <Select
                      value={flashcardModuleId}
                      onChange={(e) => setFlashcardModuleId(e.target.value)}
                      className="bg-neutral-bg text-sm"
                      disabled={activeModules.length === 0}
                      options={activeModules.length > 0 ? activeModules.map((m) => ({ value: m.id, label: m.title })) : [{ value: '', label: 'No modules' }]}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Front Face</label>
                  <Input type="text" value={flashcardFront} onChange={(e) => setFlashcardFront(e.target.value)} placeholder="Question / term..." className="bg-neutral-bg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] text-secondary font-bold">Back Face</label>
                  <Textarea value={flashcardBack} onChange={(e) => setFlashcardBack(e.target.value)} placeholder="Explanation / formula / answer..." rows={2} className="resize-none bg-neutral-bg text-sm min-h-[96px]" />
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
                  <Input type="date" value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} className="bg-neutral-bg text-sm" />
                </div>
                <p className="font-sans text-[10px] text-secondary leading-normal lowercase normal-case">
                  Hide this slip until the selected date, then return it to intake automatically.
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
          <SecondaryButton type="button" onClick={handleArchiveClick} className="min-h-10 px-3.5 py-2">
            <Archive className="h-3.5 w-3.5" />
            <span>Archive</span>
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleDeleteClick} variant="danger" className="min-h-10 px-3.5 py-2 shadow-none">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </PrimaryButton>
        </div>

      </div>
    );
  };

  return (
    <PageShell>
      <SectionHeader
        title="Inbox Command"
        subtitle={`${filteredSlips.length} visible · ${statusCounts.unprocessed} waiting for triage`}
        action={
          <div className="flex items-center gap-2">
            <SecondaryButton
              type="button"
              onClick={handleAutoTagAllInbox}
              disabled={isAutoTaggingAll}
              className="btn-press border border-accent/40 px-3.5 py-2 font-label text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${isAutoTaggingAll ? 'animate-spin' : ''}`} />
              <span>{isAutoTaggingAll ? 'Auto-Tagging...' : 'AI Tag All Slips'}</span>
            </SecondaryButton>
            <button
              onClick={() => setShowQuickCapture(!showQuickCapture)}
              className="btn-press border border-primary px-4 py-2 font-label text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 bg-primary text-on-primary cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Quick Slip</span>
            </button>
          </div>
        }
      />

      <section className="app-panel overflow-hidden p-0">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Waiting', value: statusCounts.unprocessed, icon: Inbox, tone: statusCounts.unprocessed > 0 ? 'text-accent' : 'text-primary' },
            { label: 'Processed', value: statusCounts.processed, icon: Check, tone: 'text-success' },
            { label: 'Snoozed', value: statusCounts.snoozed, icon: Clock, tone: statusCounts.snoozed > 0 ? 'text-warning' : 'text-primary' },
            { label: 'Captured today', value: capturedToday, icon: PlusCircle, tone: capturedToday > 0 ? 'text-accent' : 'text-primary' },
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
      </section>

      {/* Quick Capture Form Drawer */}
      {showQuickCapture && (
        <form onSubmit={handleQuickCaptureSubmit} className="app-panel p-6 space-y-4 font-label text-xs animate-modal">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="font-bold uppercase text-accent">File Quick Slip</span>
            <IconButton type="button" onClick={() => setShowQuickCapture(false)} title="Close quick capture" className="h-9 w-9">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Title" type="text" required value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} placeholder="Core keyword..." className="bg-neutral-bg text-sm" />
            <Select label="Category" value={quickType} onChange={(e) => setQuickType(e.target.value as InboxItem['type'])} className="bg-neutral-bg text-sm" options={quickTypeOptions} />
            <Input label="URL / Reference Link" type="text" value={quickUrl} onChange={(e) => setQuickUrl(e.target.value)} placeholder="https://..." className="bg-neutral-bg text-sm" />
            <div className="md:col-span-3">
              <Textarea label="Content Notes" value={quickContent} onChange={(e) => setQuickContent(e.target.value)} placeholder="Content details, notes, quotes..." rows={3} className="resize-none bg-neutral-bg text-sm min-h-[120px]" />
            </div>
            <div className="md:col-span-3">
              <Input label="Tags (comma separated)" type="text" value={quickTags} onChange={(e) => setQuickTags(e.target.value)} placeholder="ideas, health, work" className="bg-neutral-bg text-sm" />
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

      <section className="app-panel p-3 md:p-4 space-y-4">
        <div className="grid grid-cols-4 border border-border bg-neutral-bg font-label text-[10px] md:text-xs uppercase tracking-wider font-bold rounded-2xl overflow-hidden">
          {channelTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setSelectedItemId(null);
                }}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 border-r border-border last:border-r-0 transition-all cursor-pointer btn-press ${
                  isActive ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 font-label text-xs">
          <div className="flex gap-2 md:hidden">
            <label className="flex items-center justify-between gap-2 bg-neutral-bg border border-border px-4 h-11 flex-1 rounded-2xl focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40 transition-all">
              <div className="flex items-center gap-2 w-full min-w-0">
                <Search className="h-4 w-4 text-secondary shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, content, or tags..."
                  className="w-full bg-transparent text-primary font-sans focus:outline-none placeholder:text-secondary/60 text-sm"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-secondary hover:text-primary p-1 cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="border border-border px-4 h-11 text-primary hover:border-primary transition-colors uppercase font-bold cursor-pointer btn-press flex items-center gap-2 shrink-0 rounded-2xl"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>
          </div>

          <div className="hidden md:grid md:grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.72fr))_auto] gap-3">
            <div className="space-y-1">
              <label className="block text-[9px] text-secondary font-bold uppercase tracking-wider">
                Search
              </label>
              <div className="h-11 flex items-center justify-between gap-2 bg-neutral-bg border border-border px-4 rounded-2xl focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <div className="flex items-center gap-2.5 w-full min-w-0">
                  <Search className="h-4 w-4 text-secondary/70 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter title, notes, links, or tags... ('/' to focus)"
                    className="w-full bg-transparent text-primary font-sans border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 p-0 m-0 shadow-none appearance-none placeholder:text-secondary/50 text-sm"
                  />
                </div>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-secondary hover:text-primary p-1 cursor-pointer shrink-0 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-block font-mono text-[9px] text-secondary/50 border border-border/60 px-1.5 py-0.5 rounded bg-surface/40 shrink-0">
                    /
                  </kbd>
                )}
              </div>
            </div>

            <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'All' | InboxItem['type'])} className="bg-neutral-bg text-xs font-bold uppercase" options={inboxTypeOptions} />

            <Select label="Signal" value={signalFilter} onChange={(e) => setSignalFilter(e.target.value as typeof signalFilter)} className="bg-neutral-bg text-xs font-bold uppercase" options={signalOptions} />

            <Select label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-neutral-bg text-xs font-bold uppercase" options={sortOptions} />

            <button
              type="button"
              onClick={resetTriageControls}
              disabled={activeRefinementCount === 0}
              className="self-end h-11 border border-border px-4 rounded-2xl text-primary disabled:text-secondary/50 disabled:cursor-not-allowed hover:border-primary transition-colors uppercase font-bold cursor-pointer btn-press flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset {activeRefinementCount > 0 ? `(${activeRefinementCount})` : ''}
            </button>
          </div>

          <div className="md:hidden text-[11px] text-secondary min-h-[1rem]">
            {activeFilterLabels.length > 0 ? activeFilterLabels.join(' • ') : 'No filters applied'}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] gap-6 items-start">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 font-label text-[10px] uppercase tracking-wider text-secondary border-b border-border pb-2 px-1">
            <div>
              <span className="block text-primary font-bold">
                {filteredSlips.length} slips visible
                {searchQuery.trim() && (
                  <span className="ml-2 font-semibold text-accent normal-case">
                    (matching &ldquo;{searchQuery.trim()}&rdquo;)
                  </span>
                )}
              </span>
              <span>
                {channelTabs.find((tab) => tab.key === statusFilter)?.label || 'Inbox'} channel
                {typeFilter !== 'All' ? ` · ${typeFilter}` : ''}
                {signalFilter !== 'all' ? ` · ${signalFilter.replace('_', ' ')}` : ''}
              </span>
            </div>
            <span className="hidden sm:block">{sortBy.replace('_', ' ')} order</span>
          </div>

          <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
            {filteredSlips.length > 0 ? (
              filteredSlips.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`app-panel-subtle p-4 space-y-2.5 relative transition-all duration-200 cursor-pointer rounded-2xl overflow-hidden ${
                      isSelected
                        ? 'border-primary/50 bg-neutral-bg/95 shadow-md ring-1 ring-primary/20'
                        : 'hover:border-border hover:bg-neutral-bg/75 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all ${isSelected ? 'bg-primary' : 'bg-transparent'}`} />

                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center space-x-2 min-w-0">
                        {getTypeBadge(item.type)}
                      </div>
                      <span className="font-label text-[9px] text-secondary/80 font-bold shrink-0">
                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="font-sans text-sm font-bold text-primary line-clamp-2 leading-snug">
                      {item.title}
                    </h4>

                    {item.content && (
                      <p className="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {(item.tags || []).slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="font-label text-[8px] border border-secondary/20 bg-neutral-bg/60 text-secondary px-2 py-0.5 uppercase rounded-md font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(item.url || item.source_url) && (
                          <span className="font-label text-[8px] uppercase text-accent border border-accent/30 bg-accent/10 px-1.5 py-0.5 rounded font-bold">
                            Link
                          </span>
                        )}
                        <ArrowRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? 'text-primary' : 'text-secondary/40'}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No slips match your selection."
                description="Broaden the filters or capture a new slip to refill this queue."
              />
            )}
          </div>
        </div>

        <EditorialCard className="hidden md:block self-start space-y-6">
          {renderPanelContent(false)}
        </EditorialCard>
      </div>

      {/* Mobile Details Pop-up Modal overlay */}
      {selectedItem && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedItemId(null);
            }
          }}
          className="md:hidden fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
        >
          <div className="app-panel w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 space-y-6 shadow-lg animate-modal">
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

      {/* Mobile Filters Pop-up Modal overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] p-4 pb-[calc(4.25rem+env(safe-area-inset-bottom)+1rem)] md:hidden flex items-end">
          <div className="w-full app-panel shadow-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neutral-bg/50">
              <div>
                <div className="font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">Inbox Filters</div>
                <h3 className="font-display text-lg text-primary font-bold">Adjust the triage view</h3>
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
              <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'All' | InboxItem['type'])} className="bg-neutral-bg text-xs font-bold uppercase" options={inboxTypeOptions} />

              <Select label="Signal" value={signalFilter} onChange={(e) => setSignalFilter(e.target.value as typeof signalFilter)} className="bg-neutral-bg text-xs font-bold uppercase" options={signalOptions} />

              <Select label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-neutral-bg text-xs font-bold uppercase" options={sortOptions} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-t border-border">
              <SecondaryButton type="button" onClick={resetTriageControls} disabled={activeRefinementCount === 0}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="button" onClick={() => setShowMobileFilters(false)}>
                Apply
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
