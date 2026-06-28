'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useDashboard, InboxItem } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
import { useSearchParams } from 'next/navigation';
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
  Pencil
} from 'lucide-react';

function InboxPageContent() {
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
    addLesson
  } = useDashboard();

  const { showToast } = useToast();

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  // Form states
  const [captureType, setCaptureType] = useState<'text' | 'url' | 'snippet'>('text');
  const [inputTitle, setInputTitle] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [inputTags, setInputTags] = useState('');
  const [captureDestination, setCaptureDestination] = useState<'unsorted' | 'knowledge'>('unsorted');

  // UI Interactive states
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null);
  const [conversionType, setConversionType] = useState<'task' | 'academy' | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'knowledge' | 'snoozed_archived'>('queue');
  
  // Triage setup states
  const [targetProjectId, setTargetProjectId] = useState('');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('searchQuery');
      if (query) {
        setSearchQuery(query);
      }
    }
  }, []);

  // Input ref for keyboard shortcut focus
  const captureTitleInputRef = useRef<HTMLInputElement | null>(null);
  // Ref for click outside dropdown detection
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Edit states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<'text' | 'url' | 'snippet'>('text');
  const [editUrl, setEditUrl] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const searchParams = useSearchParams();
  const highlightId = searchParams ? searchParams.get('id') : null;

  // Auto-select tab, scroll, and highlight when id query param is present
  useEffect(() => {
    if (highlightId && inboxItems.length > 0) {
      const item = inboxItems.find((i) => i.id === highlightId);
      if (item) {
        if (item.status === 'unsorted') {
          setActiveTab('queue');
        } else if (item.status === 'knowledge') {
          setActiveTab('knowledge');
        } else if (item.status === 'snoozed' || item.status === 'archived') {
          setActiveTab('snoozed_archived');
        }

        setTimeout(() => {
          const el = document.getElementById(`inbox-card-${highlightId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-tertiary', 'ring-offset-2');
            const timer = setTimeout(() => {
              el.classList.remove('ring-2', 'ring-tertiary', 'ring-offset-2');
            }, 3000);
            return () => clearTimeout(timer);
          }
        }, 300);
      }
    }
  }, [highlightId, inboxItems]);

  function startEditing(item: InboxItem) {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditType(item.type);
    setEditUrl(item.url || '');
    setEditContent(item.content || '');
    setEditTags((item.tags || []).map(t => t.replace('#', '')).join(', '));
    setActiveDropdownId(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) return;

    let finalUrl = editUrl;
    if (editType === 'url' && editUrl) {
      if (!editUrl.startsWith('http://') && !editUrl.startsWith('https://')) {
        finalUrl = 'https://' + editUrl;
      }
    }

    const tagsArray = editTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    const updates = {
      title: editTitle,
      type: editType,
      url: editType === 'url' ? finalUrl : undefined,
      content: editType === 'snippet' ? editContent : undefined,
      tags: tagsArray
    };

    try {
      await updateInboxItem(id, updates);
      showToast('Changes saved successfully.', 'success');
      setEditingItemId(null);
    } catch (err) {
      console.error('Failed to update inbox item:', err);
      showToast('Failed to save changes. Please try again.', 'error');
    }
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      );

      // Ctrl+S / Cmd+S to save card edit
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        if (editingItemId) {
          e.preventDefault();
          handleSaveEdit(editingItemId);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (deleteModalOpen) {
          e.preventDefault();
          setDeleteModalOpen(false);
          return;
        }
        if (convertingItemId) {
          e.preventDefault();
          setConvertingItemId(null);
          setConversionType(null);
          return;
        }
        if (editingItemId) {
          e.preventDefault();
          setEditingItemId(null);
          return;
        }
        if (activeDropdownId) {
          e.preventDefault();
          setActiveDropdownId(null);
          return;
        }
        if (isTyping) {
          (activeEl as HTMLElement).blur();
        }
      }

      if (isTyping) return;

      // Shortcut: Cmd+K or Ctrl+K or '/' key
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        captureTitleInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingItemId, editTitle, editType, editUrl, editContent, editTags, convertingItemId, deleteModalOpen, activeDropdownId]);

  // Handle click outside dropdown and Escape key
  useEffect(() => {
    if (!activeDropdownId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownId(null);
      }
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdownId]);

  // Reset triage setup states when converting item changes
  useEffect(() => {
    setTargetProjectId('');
    setTargetCourseId('');
    setTargetModuleId('');
    setTaskPriority('medium');
  }, [convertingItemId]);

  // Scraper states
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Gemma Autotagging states
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagsApiStatus, setTagsApiStatus] = useState<string | null>(null);

  // Drag-and-Drop states
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropzone, setActiveDropzone] = useState<string | null>(null);

  const draggedItem = useMemo(() => inboxItems.find((i) => i.id === draggedItemId), [draggedItemId, inboxItems]);

  // URL Autoscraper effect
  useEffect(() => {
    if (captureType !== 'url' || !inputUrl) {
      setScrapeError(null);
      setIsScraping(false);
      return;
    }

    const isUrlValid = (str: string) => {
      try {
        const withProtocol = str.startsWith('http://') || str.startsWith('https://') ? str : 'https://' + str;
        new URL(withProtocol);
        return str.includes('.');
      } catch {
        return false;
      }
    };

    if (!isUrlValid(inputUrl)) {
      return;
    }

    setIsScraping(true);
    setScrapeError(null);

    const applyHostnameFallback = () => {
      try {
        const withProtocol = inputUrl.startsWith('http://') || inputUrl.startsWith('https://') ? inputUrl : 'https://' + inputUrl;
        const parsed = new URL(withProtocol);
        const fallbackTitle = parsed.hostname.replace('www.', '');
        setInputTitle((prev) => (!prev || prev === 'External Link' ? fallbackTitle : prev));
      } catch {
        setInputTitle((prev) => (!prev || prev === 'External Link' ? 'External Link' : prev));
      }
    };

    const timer = setTimeout(async () => {
      try {
        const encodedUrl = encodeURIComponent(
          inputUrl.startsWith('http://') || inputUrl.startsWith('https://') ? inputUrl : 'https://' + inputUrl
        );
        const res = await fetch(`/api/scrape?url=${encodedUrl}`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.title) {
            setInputTitle((prev) => (!prev || prev === 'External Link' ? data.title : prev));
          }
          if (data.description) {
            setInputContent((prev) => (!prev ? data.description : prev));
          }
        } else {
          setScrapeError('Unable to load metadata (using fallback)');
          applyHostnameFallback();
        }
      } catch (err) {
        console.warn('Metadata scraper request failed:', err instanceof Error ? err.message : err);
        setScrapeError('Unable to load metadata (using fallback)');
        applyHostnameFallback();
      } finally {
        setIsScraping(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [captureType, inputUrl]);

  // Gemma tags generation
  const generateGemmaTags = async () => {
    if (!inputTitle.trim()) {
      setTagsApiStatus('Title required to generate tags.');
      return;
    }

    setIsGeneratingTags(true);
    setTagsApiStatus('Analyzing content...');

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: inputTitle,
          content: inputContent,
          url: inputUrl,
        }),
      });

      if (!res.ok) throw new Error('Tag API failed');
      const data = await res.json();

      if (data.tags && Array.isArray(data.tags)) {
        setInputTags(data.tags.join(', '));
        setTagsApiStatus(
          data.geminiEnabled 
            ? 'Tags generated by Gemma.' 
            : 'Generated tags locally (Add GEMINI_API_KEY to enable Gemma).'
        );
      } else {
        setTagsApiStatus('Failed to generate tags.');
      }
    } catch (err) {
      console.error(err);
      setTagsApiStatus('Failed to connect to tagging server.');
    } finally {
      setIsGeneratingTags(false);
      setTimeout(() => setTagsApiStatus(null), 4000);
    }
  };

  // Get all unique tags currently in inbox
  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    inboxItems.forEach((item) => {
      if (item.tags) {
        item.tags.forEach((t) => {
          const clean = t.replace('#', '').trim();
          if (clean) tags.add(clean);
        });
      }
    });
    return Array.from(tags);
  }, [inboxItems]);

  // Determine current active typing tag (last term after comma)
  const currentTypingTag = useMemo(() => {
    if (!inputTags) return '';
    const parts = inputTags.split(',');
    const lastPart = parts[parts.length - 1].trim().toLowerCase();
    return lastPart.startsWith('#') ? lastPart.slice(1) : lastPart;
  }, [inputTags]);

  const tagSuggestions = useMemo(() => {
    if (!currentTypingTag) return [];
    return existingTags.filter(
      (t) => t.toLowerCase().startsWith(currentTypingTag) && !inputTags.toLowerCase().includes(t.toLowerCase())
    );
  }, [currentTypingTag, existingTags, inputTags]);

  const handleSelectSuggestion = (suggestion: string) => {
    const parts = inputTags.split(',');
    parts[parts.length - 1] = ` ${suggestion}`;
    setInputTags(parts.join(',').trim());
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItemId(null);
    setActiveDropzone(null);
  };

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    setActiveDropzone(zone);
  };

  const handleDragLeave = () => {
    setActiveDropzone(null);
  };

  const handleDrop = async (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!itemId) return;

    const item = inboxItems.find((i) => i.id === itemId);
    if (!item) return;

    if (zone === 'task') {
      setConvertingItemId(itemId);
      setConversionType('task');
    } else if (zone === 'academy') {
      setConvertingItemId(itemId);
      setConversionType('academy');
    } else if (zone === 'snooze') {
      await updateInboxItemStatus(itemId, 'snoozed');
      showToast('Item snoozed until tomorrow.', 'info');
    } else if (zone === 'archive') {
      await updateInboxItemStatus(itemId, 'archived');
      showToast('Item archived successfully.', 'info');
    } else if (zone === 'delete') {
      setItemToDelete({ id: item.id, title: item.title });
      setDeleteModalOpen(true);
    } else if (zone === 'knowledge') {
      await updateInboxItemStatus(itemId, 'knowledge');
      showToast('Item saved to Knowledge Base.', 'success');
    } else if (zone === 'unsorted') {
      await updateInboxItemStatus(itemId, 'unsorted');
      showToast('Item moved to triage queue.', 'info');
    }

    handleDragEnd();
  };

  // ==========================================
  // QUICK CAPTURE SUBMIT
  // ==========================================
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captureType !== 'url' && !inputTitle.trim()) return;

    let finalTitle = inputTitle;
    let finalUrl = inputUrl;
    const finalContent = inputContent;

    // URL Mock Parser logic
    if (captureType === 'url') {
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        finalUrl = 'https://' + inputUrl;
      }
      try {
        const parsed = new URL(finalUrl);
        finalTitle = inputTitle || parsed.hostname.replace('www.', '');
      } catch {
        finalTitle = inputTitle || 'External Link';
      }
    }

    const tagsArray = inputTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    try {
      await addInboxItem(captureType, finalTitle, finalUrl || undefined, finalContent || undefined, tagsArray, captureDestination);
      showToast('Inbox item captured successfully.', 'success');
      
      // Reset Form on success
      setInputTitle('');
      setInputUrl('');
      setInputContent('');
      setInputTags('');
    } catch (err) {
      console.error('Failed to capture inbox item:', err);
      showToast('Failed to capture inbox item. Please try again.', 'error');
    }
  };

  // ==========================================
  // TRIAGE CONVERSIONS
  // ==========================================
  const handleConvertToTask = async (item: InboxItem) => {
    if (!targetProjectId) return;
    
    // Add to project tasks
    await addTask(
      targetProjectId, 
      item.title, 
      item.content || item.url || 'Imported from Inbox triage.', 
      taskPriority,
      getLocalDateString(),
      'none',
      undefined,
      [],
      'Work',
      item.id
    );

    // Update status to task
    await updateInboxItemStatus(item.id, 'task', targetProjectId);

    showToast('✓ Task created successfully', 'success', {
      label: 'View Tasks',
      href: '/tasks'
    });
    
    // Reset triage modal states
    setConvertingItemId(null);
    setConversionType(null);
    setTargetProjectId('');
  };

  const handleSendToAcademy = async (item: InboxItem) => {
    if (!targetModuleId) return;

    // Add to course module lessons
    await addLesson(
      targetModuleId,
      item.title,
      item.url || undefined
    );

    // Update status to academy
    await updateInboxItemStatus(item.id, 'academy');

    showToast('✓ Academy lesson created successfully', 'success', {
      label: 'View Academy',
      href: `/academy?courseId=${targetCourseId}&moduleId=${targetModuleId}`
    });

    // Reset triage states
    setConvertingItemId(null);
    setConversionType(null);
    setTargetModuleId('');
  };

  // Filter items
  const unsortedItems = inboxItems.filter((item) => item.status === 'unsorted');
  const snoozedItems = inboxItems.filter((item) => item.status === 'snoozed');
  const archivedItems = inboxItems.filter((item) => item.status === 'archived');
  const knowledgeItems = inboxItems.filter((item) => item.status === 'knowledge');

  const filterBySearch = (items: InboxItem[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.url && item.url.toLowerCase().includes(query)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)))
      );
    });
  };

  const filteredUnsorted = filterBySearch(unsortedItems);
  const filteredSnoozed = filterBySearch(snoozedItems);
  const filteredArchived = filterBySearch(archivedItems);
  const filteredKnowledge = filterBySearch(knowledgeItems);

  const getTagColorClass = (tag: string) => {
    const clean = tag.toLowerCase();
    if (clean.includes('idea')) return 'bg-primary text-on-primary';
    if (clean.includes('purchase')) return 'bg-surface border border-secondary text-primary';
    if (clean.includes('read')) return 'bg-secondary/20 text-primary';
    return 'bg-neutral-bg border border-secondary/30 text-secondary';
  };

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse">
        <header className="border-b-2 border-secondary/20 pb-4">
          <div className="h-8 bg-secondary/15 w-48 rounded-sm mb-2" />
          <div className="h-4 bg-secondary/10 w-80 rounded-sm" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8 self-start">
            <div className="bg-surface border border-secondary/20 p-6 rounded-sm space-y-4">
              <div className="h-4 bg-secondary/15 w-32 rounded-sm" />
              <div className="h-8 bg-secondary/10 w-full rounded-sm" />
              <div className="h-16 bg-secondary/10 w-full rounded-sm" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-secondary/20 p-6 rounded-sm space-y-4">
              <div className="h-6 bg-secondary/15 w-40 rounded-sm" />
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-secondary/15 p-4 rounded-sm space-y-2">
                    <div className="h-4 bg-secondary/15 w-1/3 rounded-sm" />
                    <div className="h-3 bg-secondary/10 w-3/4 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="border-b-2 border-primary pb-4">
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          THE TRIAGE CHANNEL
        </h2>
        <p className="font-label text-xs text-secondary uppercase tracking-[0.2em] mt-0.5">
          Inbox Quick Capture &bull; System Intake Pipeline
        </p>
      </header>

      {/* Search Bar (Desktop) */}
      <div className="hidden lg:flex relative border-2 border-primary bg-surface px-4 py-3 items-center space-x-3 rounded-sm shadow-[2px_2px_0px_0px_var(--primary)]">
        <Search className="h-5 w-5 text-primary shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search all inboxes globally by title, content, URL, or tag..."
          className="w-full bg-transparent text-sm text-primary focus:outline-none font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="font-label text-xs text-tertiary hover:underline uppercase tracking-wider font-semibold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ==========================================
            COLUMN 1: MULTI-MODAL QUICK CAPTURE & MOBILE SEARCH
           ========================================== */}
        <div className="space-y-8 self-start">
          <section className="bg-surface border border-secondary p-6 rounded-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                Intel Capture System
              </span>
              <span className="hidden md:inline font-label text-[10px] text-secondary/60 uppercase tracking-wider">
                [Cmd+K] / [/] to focus
              </span>
            </div>
          <form onSubmit={handleCapture} className="space-y-4">
            {/* Capture Type Selection */}
            <div className="flex border border-secondary font-label text-sm md:text-xs">
              <button
                type="button"
                onClick={() => { setCaptureType('text'); setInputUrl(''); }}
                className={`flex-1 py-3 md:py-2 flex items-center justify-center space-x-1.5 transition-all ${
                  captureType === 'text' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>TEXT</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureType('url')}
                className={`flex-1 py-3 md:py-2 flex items-center justify-center space-x-1.5 transition-all border-l border-r border-secondary ${
                  captureType === 'url' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>URL</span>
              </button>
              <button
                type="button"
                onClick={() => { setCaptureType('snippet'); setInputUrl(''); }}
                className={`flex-1 py-3 md:py-2 flex items-center justify-center space-x-1.5 transition-all ${
                  captureType === 'snippet' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>SNIPPET</span>
              </button>
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <label className="block font-label text-xs text-secondary uppercase tracking-[0.15em]">
                {captureType === 'url' ? 'Link Label (Optional)' : 'Capture Title'}
              </label>
              <input
                ref={captureTitleInputRef}
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder={captureType === 'url' ? 'Leave empty to auto-extract' : 'e.g. Brainstorm layout concepts'}
                required={captureType !== 'url'}
                className="w-full bg-neutral-bg border border-secondary px-3 py-2 text-xs text-primary focus:outline-none focus:border-tertiary font-sans"
              />
            </div>

            {/* URL Input (conditional) */}
            {captureType === 'url' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block font-label text-xs text-secondary uppercase tracking-[0.15em]">
                    Resource URL
                  </label>
                  {isScraping && (
                    <span className="font-label text-xs text-tertiary animate-pulse uppercase tracking-wider font-semibold">
                      Scraping metadata...
                    </span>
                  )}
                  {scrapeError && !isScraping && (
                    <span className="font-label text-xs text-secondary uppercase tracking-wider">
                      {scrapeError}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="e.g. github.com/nextjs/boilerplate"
                  required
                  className="w-full bg-neutral-bg border border-secondary px-3 py-2 text-xs text-primary focus:outline-none focus:border-tertiary font-sans"
                />
              </div>
            )}

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <label className="block font-label text-xs text-secondary uppercase tracking-[0.15em]">
                {captureType === 'snippet' ? 'Code / Text Snippet' : 'Detailed Notes'}
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                rows={4}
                placeholder="Insert details, snippets or references..."
                className="w-full bg-neutral-bg border border-secondary px-3 py-2 text-xs text-primary focus:outline-none focus:border-tertiary font-sans resize-none"
              />
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block font-label text-xs text-secondary uppercase tracking-[0.15em]">
                  Tags (comma separated)
                </label>
                <button
                  type="button"
                  onClick={generateGemmaTags}
                  disabled={isGeneratingTags || !inputTitle.trim()}
                  className="font-label text-xs text-tertiary hover:underline uppercase tracking-widest flex items-center space-x-1 disabled:opacity-40 disabled:no-underline cursor-pointer"
                >
                  <Sparkles className="h-2 w-2" />
                  <span>{isGeneratingTags ? 'Generating...' : 'Gemma Tags'}</span>
                </button>
              </div>
              <input
                type="text"
                value={inputTags}
                onChange={(e) => setInputTags(e.target.value)}
                placeholder="e.g. idea, read-later, health"
                className="w-full bg-neutral-bg border border-secondary px-3 py-2 text-xs text-primary focus:outline-none focus:border-tertiary font-sans"
              />
              
              {/* Autocomplete Dropdown suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 bg-surface border border-secondary p-1.5 rounded-sm">
                  {tagSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="font-label text-xs px-1.5 py-0.5 bg-neutral-bg border border-secondary/20 hover:border-tertiary text-primary rounded-sm transition-all cursor-pointer"
                    >
                      #{suggestion}
                    </button>
                  ))}
                </div>
              )}

              {tagsApiStatus && (
                <p className="font-label text-xs text-secondary uppercase mt-0.5 tracking-wider font-sans">
                  {tagsApiStatus}
                </p>
              )}
            </div>

            {/* Destination Selection */}
            <div className="space-y-1.5">
              <label className="block font-label text-sm md:text-xs text-secondary uppercase tracking-[0.15em]">
                Destination
              </label>
              <div className="flex border border-secondary font-label text-sm md:text-xs">
                <button
                  type="button"
                  onClick={() => setCaptureDestination('unsorted')}
                  className={`flex-1 py-2.5 md:py-1.5 flex items-center justify-center transition-all ${
                    captureDestination === 'unsorted' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                  }`}
                >
                  Triage Queue
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureDestination('knowledge')}
                  className={`flex-1 py-2.5 md:py-1.5 flex items-center justify-center transition-all border-l border-secondary ${
                    captureDestination === 'knowledge' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-neutral-bg'
                  }`}
                >
                  Knowledge Base
                </button>
              </div>
            </div>

            {/* Submitting button (Terracotta Red - exactly one action driver per page rule!) */}
            <button type="submit" className="w-full btn-tertiary mt-2">
              CAPTURE ENTRY
            </button>
          </form>
        </section>

        {/* Search Bar (Mobile - Below Intel Capture System) */}
        <div className="flex lg:hidden relative border-2 border-primary bg-surface px-4 py-3 items-center space-x-3 rounded-sm shadow-[2px_2px_0px_0px_var(--primary)]">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search globally..."
            className="w-full bg-transparent text-sm text-primary focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="font-label text-xs text-tertiary hover:underline uppercase tracking-wider font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

        {/* ==========================================
            COLUMN 2 & 3: TRIAGE Kanban columns
           ========================================== */}
        <section className="lg:col-span-2 space-y-8">
          
          {/* Reusable card list rendering helper */}
          {(() => {
            // We define renderInboxCards as a local function helper to reuse JSX layout perfectly
            const renderInboxCards = (items: InboxItem[], emptyMessage: string) => {
              return (
                <div className="space-y-4">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div
                        id={`inbox-card-${item.id}`}
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={`border border-secondary/40 bg-neutral-bg/40 p-4 rounded-sm space-y-3 relative group transition-all cursor-grab active:cursor-grabbing hover:border-primary ${
                          draggedItemId === item.id ? 'opacity-30 border-dashed border-secondary' : ''
                        }`}
                      >
                        {/* Header line on card */}
                        <div className="flex justify-between items-start pr-8">
                          <div className="flex items-center space-x-2">
                            {/* Drag grip indicator */}
                            <div className="text-secondary/40 group-hover:text-secondary transition-colors cursor-grab">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            {item.type === 'url' && <Link2 className="h-3.5 w-3.5 text-tertiary" />}
                            {item.type === 'text' && <FileText className="h-3.5 w-3.5 text-secondary" />}
                            {item.type === 'snippet' && <Scissors className="h-3.5 w-3.5 text-primary" />}
                            <h4 className="font-sans text-xs font-semibold text-primary">
                              {item.title}
                            </h4>
                          </div>

                          {/* Dropdown Action Menu */}
                          <div className="absolute right-4 top-4">
                            <button
                              onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                              className="text-secondary hover:text-primary p-1 cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {activeDropdownId === item.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-surface border border-secondary z-30 shadow-lg font-label text-xs">
                                <button
                                  onClick={() => {
                                    setConvertingItemId(item.id);
                                    setConversionType('task');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                >
                                  <FolderPlus className="h-3.5 w-3.5 text-secondary" />
                                  <span>Convert to Task</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConvertingItemId(item.id);
                                    setConversionType('academy');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                >
                                  <GraduationCap className="h-3.5 w-3.5 text-secondary" />
                                  <span>Send to Academy</span>
                                </button>

                                {item.status === 'knowledge' ? (
                                  <button
                                    onClick={async () => {
                                      await updateInboxItemStatus(item.id, 'unsorted');
                                      setActiveDropdownId(null);
                                      showToast('Item moved to triage queue.', 'info');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                  >
                                    <Inbox className="h-3.5 w-3.5 text-secondary" />
                                    <span>Move to Triage Queue</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      await updateInboxItemStatus(item.id, 'knowledge');
                                      setActiveDropdownId(null);
                                      showToast('Item saved to Knowledge Base.', 'success');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                  >
                                    <BookOpen className="h-3.5 w-3.5 text-secondary" />
                                    <span>Save to Knowledge Base</span>
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'snoozed');
                                    setActiveDropdownId(null);
                                    showToast('Item snoozed until tomorrow.', 'info');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                >
                                  <Clock className="h-3.5 w-3.5 text-secondary" />
                                  <span>Snooze until Tomorrow</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'archived');
                                    setActiveDropdownId(null);
                                    showToast('Item archived successfully.', 'info');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-primary cursor-pointer"
                                >
                                  <Archive className="h-3.5 w-3.5 text-secondary" />
                                  <span>Archive</span>
                                </button>
                                <div className="border-t border-secondary/20"></div>
                                <button
                                  onClick={() => {
                                    setItemToDelete({ id: item.id, title: item.title });
                                    setDeleteModalOpen(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center space-x-2 text-tertiary cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Forever</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content / Snippet / URL Preview Card */}
                        {item.type === 'url' ? (
                          <div className="border border-secondary/25 bg-surface p-3 rounded-sm space-y-2 font-sans select-none">
                            <div className="flex items-center space-x-2">
                              {/* Favicon */}
                              <div className="h-4 w-4 rounded-sm bg-neutral-bg flex items-center justify-center overflow-hidden shrink-0 border border-secondary/20">
                                {item.url && (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(item.url.startsWith('http') ? item.url : 'https://' + item.url).hostname}&sz=16`}
                                    alt="favicon"
                                    className="h-3.5 w-3.5 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <span className="text-xs text-secondary font-label uppercase tracking-wide truncate max-w-[200px]">
                                {item.url ? new URL(item.url.startsWith('http') ? item.url : 'https://' + item.url).hostname : 'link'}
                              </span>
                            </div>
                            {item.content && (
                              <p className="text-xs text-secondary leading-relaxed line-clamp-2 font-sans">
                                {item.content}
                              </p>
                            )}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 font-label text-xs text-tertiary uppercase tracking-wider hover:underline"
                              >
                                <span>Visit Resource</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          item.content && (
                            <p className={`font-sans text-xs text-secondary leading-relaxed whitespace-pre-wrap ${
                              item.type === 'snippet' ? 'font-mono bg-neutral-bg p-2 border border-secondary/20 overflow-x-auto text-xs' : ''
                            }`}>
                              {item.content}
                            </p>
                          )
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`font-label text-xs px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${getTagColorClass(tag)}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* INLINE CONVERSION DRAWER */}
                        {convertingItemId === item.id && (
                          <div className="mt-4 p-4 border border-secondary bg-surface space-y-3 font-label text-xs">
                            <div className="flex justify-between items-center border-b border-secondary/20 pb-1.5 mb-1.5">
                              <span className="font-bold text-primary uppercase">
                                {conversionType === 'task' ? 'Setup Task Conversion' : 'Select Academy Module'}
                              </span>
                              <button
                                onClick={() => {
                                  setConvertingItemId(null);
                                  setConversionType(null);
                                }}
                                className="text-secondary hover:text-primary"
                              >
                                Cancel
                              </button>
                            </div>

                            {conversionType === 'task' ? (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-secondary">Target Project</label>
                                  <select
                                    value={targetProjectId}
                                    onChange={(e) => setTargetProjectId(e.target.value)}
                                    className="w-full bg-neutral-bg border border-secondary p-1.5 font-sans"
                                  >
                                    <option value="">-- Choose Project --</option>
                                    {projects.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-secondary">Priority Level</label>
                                  <select
                                    value={taskPriority}
                                    onChange={(e) => setTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                                    className="w-full bg-neutral-bg border border-secondary p-1.5 font-sans"
                                  >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => handleConvertToTask(item)}
                                  disabled={!targetProjectId}
                                  className="w-full bg-primary hover:bg-tertiary text-on-primary py-2 uppercase text-xs tracking-widest disabled:opacity-50"
                                >
                                  Confirm Task Convert
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-secondary">Choose Course</label>
                                  <select
                                    value={targetCourseId}
                                    onChange={(e) => {
                                      setTargetCourseId(e.target.value);
                                      setTargetModuleId('');
                                    }}
                                    className="w-full bg-neutral-bg border border-secondary p-1.5 font-sans"
                                  >
                                    <option value="">-- Choose Course --</option>
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                  </select>
                                </div>
                                {targetCourseId && (
                                  <div className="space-y-1">
                                    <label className="block text-xs uppercase text-secondary">Target Module</label>
                                    <select
                                      value={targetModuleId}
                                      onChange={(e) => setTargetModuleId(e.target.value)}
                                      className="w-full bg-neutral-bg border border-secondary p-1.5 font-sans"
                                    >
                                      <option value="">-- Choose Module --</option>
                                      {courseModules
                                        .filter((m) => m.course_id === targetCourseId)
                                        .map((m) => (
                                          <option key={m.id} value={m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleSendToAcademy(item)}
                                  disabled={!targetModuleId}
                                  className="w-full bg-primary hover:bg-tertiary text-on-primary py-2 uppercase text-xs tracking-widest disabled:opacity-50"
                                >
                                  Confirm Academy Send
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 border border-dashed border-secondary/40 bg-neutral-bg/20 rounded-sm">
                      <Inbox className="h-8 w-8 text-secondary/40 mx-auto mb-2" />
                      <p className="font-sans text-xs text-secondary italic">{emptyMessage}</p>
                    </div>
                  )}
                </div>
              );
            };

            const isSearching = searchQuery.trim().length > 0;
            const globalSearchResults = filterBySearch(inboxItems);

            return (
              <>
                {/* Navigation Tabs (Hidden during search) */}
                {!isSearching && (
                  <div className="flex border-b border-secondary/40 font-label text-sm md:text-xs space-x-4 mb-4">
                    <button
                      onClick={() => setActiveTab('queue')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'queue'
                          ? 'border-tertiary text-primary'
                          : 'border-transparent text-secondary hover:text-primary'
                      }`}
                    >
                      Triage Queue ({unsortedItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('knowledge')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'knowledge'
                          ? 'border-tertiary text-primary'
                          : 'border-transparent text-secondary hover:text-primary'
                      }`}
                    >
                      Knowledge Base ({knowledgeItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('snoozed_archived')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'snoozed_archived'
                          ? 'border-tertiary text-primary'
                          : 'border-transparent text-secondary hover:text-primary'
                      }`}
                    >
                      Snoozed & Archived ({snoozedItems.length + archivedItems.length})
                    </button>
                  </div>
                )}

                {/* DRAG AND DROP TARGET PANELS (Rendered contextually when dragging) */}
                {isDragging && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-6 gap-3 border-2 border-dashed border-secondary/60 p-4 bg-neutral-bg rounded-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4">
                    <div
                      onDragOver={(e) => handleDragOver(e, 'task')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'task')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'task' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                      }`}
                    >
                      <FolderPlus className="h-4 w-4 text-secondary" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Convert Task</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'academy')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'academy')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'academy' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4 text-secondary" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Send Academy</span>
                    </div>
                    {draggedItem?.status === 'knowledge' ? (
                      <div
                        onDragOver={(e) => handleDragOver(e, 'unsorted')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'unsorted')}
                        className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          activeDropzone === 'unsorted' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                        }`}
                      >
                        <Inbox className="h-4 w-4 text-secondary" />
                        <span className="font-label text-xs uppercase tracking-wider font-semibold">Move to Queue</span>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => handleDragOver(e, 'knowledge')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'knowledge')}
                        className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          activeDropzone === 'knowledge' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-secondary" />
                        <span className="font-label text-xs uppercase tracking-wider font-semibold">Save Knowledge</span>
                      </div>
                    )}
                    <div
                      onDragOver={(e) => handleDragOver(e, 'snooze')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'snooze')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'snooze' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                      }`}
                    >
                      <Clock className="h-4 w-4 text-secondary" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Snooze 24h</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'archive')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'archive')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'archive' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-secondary/40 text-primary'
                      }`}
                    >
                      <Archive className="h-4 w-4 text-secondary" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Archive</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'delete')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'delete')}
                      className={`col-span-2 md:col-span-1 border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'delete' ? 'bg-tertiary text-on-primary border-tertiary' : 'bg-surface border-tertiary/20 text-tertiary border-tertiary/40'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Delete</span>
                    </div>
                  </div>
                )}

                {/* Search Results rendering or Tab content renders */}
                {isSearching ? (
                  <div className="bg-surface border border-secondary p-6 rounded-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                        Search Results ({globalSearchResults.length})
                      </span>
                    </div>
                    {renderInboxCards(globalSearchResults, "No items match your search query across all inboxes.")}
                  </div>
                ) : (
                  <>
                    {activeTab === 'queue' && (
                      <div className="bg-surface border border-secondary p-6 rounded-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                            Pending Triage Queue ({unsortedItems.length})
                          </span>
                        </div>
                        {renderInboxCards(filteredUnsorted, "Triage queue is empty. Active items resolved.")}
                      </div>
                    )}

                    {activeTab === 'knowledge' && (
                      <div className="bg-surface border border-secondary p-6 rounded-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block">
                            Knowledge Base & Permanent Reference Vault ({knowledgeItems.length})
                          </span>
                        </div>
                        {renderInboxCards(filteredKnowledge, "Knowledge Base is empty. Capture quotes, ideas, snippets, or links.")}
                      </div>
                    )}

                    {activeTab === 'snoozed_archived' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Snoozed Queue */}
                        <div className="bg-surface border border-secondary p-5 rounded-sm space-y-4">
                          <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block mb-3 border-b border-secondary/25 pb-1">
                            Snoozed Queue ({snoozedItems.length})
                          </span>
                          <div className="max-h-[500px] overflow-y-auto pr-1">
                            {renderInboxCards(filteredSnoozed, "No snoozed items.")}
                          </div>
                        </div>

                        {/* Archived Queue */}
                        <div className="bg-surface border border-secondary p-5 rounded-sm space-y-4">
                          <span className="font-label text-xs text-secondary uppercase tracking-[0.15em] block mb-3 border-b border-secondary/25 pb-1">
                            Archived Log ({archivedItems.length})
                          </span>
                          <div className="max-h-[500px] overflow-y-auto pr-1">
                            {renderInboxCards(filteredArchived, "Archive is empty.")}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </section>

      </div>
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={async () => {
          if (itemToDelete) {
            await deleteInboxItem(itemToDelete.id);
            showToast('Inbox item deleted forever.', 'info');
          }
        }}
        itemName={itemToDelete?.title || ''}
        itemType="inbox item"
      />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="font-label text-xs uppercase tracking-wider text-secondary">Loading Inbox Triage...</p>
      </div>
    }>
      <InboxPageContent />
    </Suspense>
  );
}
