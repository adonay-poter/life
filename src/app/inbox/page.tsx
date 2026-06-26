'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard, InboxItem } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getLocalDateString } from '@/utils/dateUtils';
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
  BookOpen
} from 'lucide-react';

export default function InboxPage() {
  const {
    inboxItems,
    projects,
    courses,
    courseModules,
    addInboxItem,
    updateInboxItemStatus,
    deleteInboxItem,
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

  // Handle click outside dropdown and Escape key
  useEffect(() => {
    if (!activeDropdownId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.absolute.right-4.top-4')) {
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
      requestAnimationFrame(() => {
        setScrapeError(null);
        setIsScraping(false);
      });
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

    requestAnimationFrame(() => {
      setIsScraping(true);
      setScrapeError(null);
    });

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
  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

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

    addInboxItem(captureType, finalTitle, finalUrl || undefined, finalContent || undefined, tagsArray, captureDestination);
    showToast('Inbox item captured successfully.', 'success');
    
    // Reset Form
    setInputTitle('');
    setInputUrl('');
    setInputContent('');
    setInputTags('');
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
      getLocalDateString()
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
      href: '/academy'
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
    if (clean.includes('idea')) return 'bg-[#1A1C1E] text-white';
    if (clean.includes('purchase')) return 'bg-white border border-[#6C7278] text-[#1A1C1E]';
    if (clean.includes('read')) return 'bg-[#6C7278]/20 text-[#1A1C1E]';
    return 'bg-[#F7F5F2] border border-[#6C7278]/30 text-[#6C7278]';
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="border-b-2 border-[#1A1C1E] pb-4">
        <h2 className="font-display text-3xl font-bold tracking-tight text-[#1A1C1E]">
          THE TRIAGE CHANNEL
        </h2>
        <p className="font-label text-xs text-[#6C7278] uppercase tracking-[0.2em] mt-0.5">
          Inbox Quick Capture &bull; System Intake Pipeline
        </p>
      </header>

      {/* Search Bar (Desktop) */}
      <div className="hidden lg:flex relative border-2 border-[#1A1C1E] bg-white px-4 py-3 items-center space-x-3 rounded-sm shadow-[2px_2px_0px_0px_#1A1C1E]">
        <Search className="h-5 w-5 text-[#1A1C1E] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search all inboxes globally by title, content, URL, or tag..."
          className="w-full bg-transparent text-sm text-[#1A1C1E] focus:outline-none font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="font-label text-xs text-[#B8422E] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
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
          <section className={`bg-white border border-[#6C7278] p-6 rounded-sm ${isSearchFocused || searchQuery.trim().length > 0 ? 'hidden lg:block' : ''}`}>
            <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-4">
              Intel Capture System
            </span>
          <form onSubmit={handleCapture} className="space-y-4">
            {/* Capture Type Selection */}
            <div className="flex border border-[#6C7278] font-label text-xs">
              <button
                type="button"
                onClick={() => { setCaptureType('text'); setInputUrl(''); }}
                className={`flex-1 py-2 flex items-center justify-center space-x-1.5 transition-all ${
                  captureType === 'text' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>TEXT</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureType('url')}
                className={`flex-1 py-2 flex items-center justify-center space-x-1.5 transition-all border-l border-r border-[#6C7278] ${
                  captureType === 'url' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>URL</span>
              </button>
              <button
                type="button"
                onClick={() => { setCaptureType('snippet'); setInputUrl(''); }}
                className={`flex-1 py-2 flex items-center justify-center space-x-1.5 transition-all ${
                  captureType === 'snippet' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>SNIPPET</span>
              </button>
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.15em]">
                {captureType === 'url' ? 'Link Label (Optional)' : 'Capture Title'}
              </label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder={captureType === 'url' ? 'Leave empty to auto-extract' : 'e.g. Brainstorm layout concepts'}
                required={captureType !== 'url'}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-2 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans"
              />
            </div>

            {/* URL Input (conditional) */}
            {captureType === 'url' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.15em]">
                    Resource URL
                  </label>
                  {isScraping && (
                    <span className="font-label text-xs text-[#B8422E] animate-pulse uppercase tracking-wider font-semibold">
                      Scraping metadata...
                    </span>
                  )}
                  {scrapeError && !isScraping && (
                    <span className="font-label text-xs text-[#6C7278] uppercase tracking-wider">
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
                  className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-2 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans"
                />
              </div>
            )}

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.15em]">
                {captureType === 'snippet' ? 'Code / Text Snippet' : 'Detailed Notes'}
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                rows={4}
                placeholder="Insert details, snippets or references..."
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-2 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans resize-none"
              />
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.15em]">
                  Tags (comma separated)
                </label>
                <button
                  type="button"
                  onClick={generateGemmaTags}
                  disabled={isGeneratingTags || !inputTitle.trim()}
                  className="font-label text-xs text-[#B8422E] hover:underline uppercase tracking-widest flex items-center space-x-1 disabled:opacity-40 disabled:no-underline cursor-pointer"
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
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-3 py-2 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans"
              />
              
              {/* Autocomplete Dropdown suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 bg-white border border-[#6C7278] p-1.5 rounded-sm">
                  {tagSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="font-label text-xs px-1.5 py-0.5 bg-[#F7F5F2] border border-[#6C7278]/20 hover:border-[#B8422E] text-[#1A1C1E] rounded-sm transition-all cursor-pointer"
                    >
                      #{suggestion}
                    </button>
                  ))}
                </div>
              )}

              {tagsApiStatus && (
                <p className="font-label text-xs text-[#6C7278] uppercase mt-0.5 tracking-wider font-sans">
                  {tagsApiStatus}
                </p>
              )}
            </div>

            {/* Destination Selection */}
            <div className="space-y-1.5">
              <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.15em]">
                Destination
              </label>
              <div className="flex border border-[#6C7278] font-label text-xs">
                <button
                  type="button"
                  onClick={() => setCaptureDestination('unsorted')}
                  className={`flex-1 py-1.5 flex items-center justify-center transition-all ${
                    captureDestination === 'unsorted' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
                  }`}
                >
                  Triage Queue
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureDestination('knowledge')}
                  className={`flex-1 py-1.5 flex items-center justify-center transition-all border-l border-[#6C7278] ${
                    captureDestination === 'knowledge' ? 'bg-[#1A1C1E] text-white' : 'text-[#1A1C1E] hover:bg-[#F7F5F2]'
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
        <div className="flex lg:hidden relative border-2 border-[#1A1C1E] bg-white px-4 py-3 items-center space-x-3 rounded-sm shadow-[2px_2px_0px_0px_#1A1C1E]">
          <Search className="h-5 w-5 text-[#1A1C1E] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search globally..."
            className="w-full bg-transparent text-sm text-[#1A1C1E] focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="font-label text-xs text-[#B8422E] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
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
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={`border border-[#6C7278]/40 bg-[#F7F5F2]/40 p-4 rounded-sm space-y-3 relative group transition-all cursor-grab active:cursor-grabbing hover:border-[#1A1C1E] ${
                          draggedItemId === item.id ? 'opacity-30 border-dashed border-[#6C7278]' : ''
                        }`}
                      >
                        {/* Header line on card */}
                        <div className="flex justify-between items-start pr-8">
                          <div className="flex items-center space-x-2">
                            {/* Drag grip indicator */}
                            <div className="text-[#6C7278]/40 group-hover:text-[#6C7278] transition-colors cursor-grab">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            {item.type === 'url' && <Link2 className="h-3.5 w-3.5 text-[#B8422E]" />}
                            {item.type === 'text' && <FileText className="h-3.5 w-3.5 text-[#6C7278]" />}
                            {item.type === 'snippet' && <Scissors className="h-3.5 w-3.5 text-[#1A1C1E]" />}
                            <h4 className="font-sans text-xs font-semibold text-[#1A1C1E]">
                              {item.title}
                            </h4>
                          </div>

                          {/* Dropdown Action Menu */}
                          <div className="absolute right-4 top-4">
                            <button
                              onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                              className="text-[#6C7278] hover:text-[#1A1C1E] p-1 cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {activeDropdownId === item.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#6C7278] z-30 shadow-lg font-label text-xs">
                                <button
                                  onClick={() => {
                                    setConvertingItemId(item.id);
                                    setConversionType('task');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                >
                                  <FolderPlus className="h-3.5 w-3.5 text-[#6C7278]" />
                                  <span>Convert to Task</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConvertingItemId(item.id);
                                    setConversionType('academy');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                >
                                  <GraduationCap className="h-3.5 w-3.5 text-[#6C7278]" />
                                  <span>Send to Academy</span>
                                </button>

                                {item.status === 'knowledge' ? (
                                  <button
                                    onClick={async () => {
                                      await updateInboxItemStatus(item.id, 'unsorted');
                                      setActiveDropdownId(null);
                                      showToast('Item moved to triage queue.', 'info');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                  >
                                    <Inbox className="h-3.5 w-3.5 text-[#6C7278]" />
                                    <span>Move to Triage Queue</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      await updateInboxItemStatus(item.id, 'knowledge');
                                      setActiveDropdownId(null);
                                      showToast('Item saved to Knowledge Base.', 'success');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                  >
                                    <BookOpen className="h-3.5 w-3.5 text-[#6C7278]" />
                                    <span>Save to Knowledge Base</span>
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'snoozed');
                                    setActiveDropdownId(null);
                                    showToast('Item snoozed until tomorrow.', 'info');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                >
                                  <Clock className="h-3.5 w-3.5 text-[#6C7278]" />
                                  <span>Snooze until Tomorrow</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'archived');
                                    setActiveDropdownId(null);
                                    showToast('Item archived successfully.', 'info');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#1A1C1E] cursor-pointer"
                                >
                                  <Archive className="h-3.5 w-3.5 text-[#6C7278]" />
                                  <span>Archive</span>
                                </button>
                                <div className="border-t border-[#6C7278]/20"></div>
                                <button
                                  onClick={() => {
                                    setItemToDelete({ id: item.id, title: item.title });
                                    setDeleteModalOpen(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-[#F7F5F2] flex items-center space-x-2 text-[#B8422E] cursor-pointer"
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
                          <div className="border border-[#6C7278]/25 bg-white p-3 rounded-sm space-y-2 font-sans select-none">
                            <div className="flex items-center space-x-2">
                              {/* Favicon */}
                              <div className="h-4 w-4 rounded-sm bg-[#F7F5F2] flex items-center justify-center overflow-hidden shrink-0 border border-[#6C7278]/20">
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
                              <span className="text-xs text-[#6C7278] font-label uppercase tracking-wide truncate max-w-[200px]">
                                {item.url ? new URL(item.url.startsWith('http') ? item.url : 'https://' + item.url).hostname : 'link'}
                              </span>
                            </div>
                            {item.content && (
                              <p className="text-xs text-[#6C7278] leading-relaxed line-clamp-2 font-sans">
                                {item.content}
                              </p>
                            )}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 font-label text-xs text-[#B8422E] uppercase tracking-wider hover:underline"
                              >
                                <span>Visit Resource</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          item.content && (
                            <p className={`font-sans text-xs text-[#6C7278] leading-relaxed whitespace-pre-wrap ${
                              item.type === 'snippet' ? 'font-mono bg-[#F7F5F2] p-2 border border-[#6C7278]/20 overflow-x-auto text-xs' : ''
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
                          <div className="mt-4 p-4 border border-[#6C7278] bg-white space-y-3 font-label text-xs">
                            <div className="flex justify-between items-center border-b border-[#6C7278]/20 pb-1.5 mb-1.5">
                              <span className="font-bold text-[#1A1C1E] uppercase">
                                {conversionType === 'task' ? 'Setup Task Conversion' : 'Select Academy Module'}
                              </span>
                              <button
                                onClick={() => {
                                  setConvertingItemId(null);
                                  setConversionType(null);
                                }}
                                className="text-[#6C7278] hover:text-[#1A1C1E]"
                              >
                                Cancel
                              </button>
                            </div>

                            {conversionType === 'task' ? (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-[#6C7278]">Target Project</label>
                                  <select
                                    value={targetProjectId}
                                    onChange={(e) => setTargetProjectId(e.target.value)}
                                    className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 font-sans"
                                  >
                                    <option value="">-- Choose Project --</option>
                                    {projects.map((p) => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-[#6C7278]">Priority Level</label>
                                  <select
                                    value={taskPriority}
                                    onChange={(e) => setTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                                    className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 font-sans"
                                  >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => handleConvertToTask(item)}
                                  disabled={!targetProjectId}
                                  className="w-full bg-[#1A1C1E] hover:bg-[#B8422E] text-white py-2 uppercase text-xs tracking-widest disabled:opacity-50"
                                >
                                  Confirm Task Convert
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-xs uppercase text-[#6C7278]">Choose Course</label>
                                  <select
                                    value={targetCourseId}
                                    onChange={(e) => {
                                      setTargetCourseId(e.target.value);
                                      setTargetModuleId('');
                                    }}
                                    className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 font-sans"
                                  >
                                    <option value="">-- Choose Course --</option>
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                  </select>
                                </div>
                                {targetCourseId && (
                                  <div className="space-y-1">
                                    <label className="block text-xs uppercase text-[#6C7278]">Target Module</label>
                                    <select
                                      value={targetModuleId}
                                      onChange={(e) => setTargetModuleId(e.target.value)}
                                      className="w-full bg-[#F7F5F2] border border-[#6C7278] p-1.5 font-sans"
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
                                  className="w-full bg-[#1A1C1E] hover:bg-[#B8422E] text-white py-2 uppercase text-xs tracking-widest disabled:opacity-50"
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
                    <div className="text-center py-16 border border-dashed border-[#6C7278]/40 bg-[#F7F5F2]/20 rounded-sm">
                      <Inbox className="h-8 w-8 text-[#6C7278]/40 mx-auto mb-2" />
                      <p className="font-sans text-xs text-[#6C7278] italic">{emptyMessage}</p>
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
                  <div className="flex border-b border-[#6C7278]/40 font-label text-xs space-x-4 mb-4">
                    <button
                      onClick={() => setActiveTab('queue')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'queue'
                          ? 'border-[#B8422E] text-[#1A1C1E]'
                          : 'border-transparent text-[#6C7278] hover:text-[#1A1C1E]'
                      }`}
                    >
                      Triage Queue ({unsortedItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('knowledge')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'knowledge'
                          ? 'border-[#B8422E] text-[#1A1C1E]'
                          : 'border-transparent text-[#6C7278] hover:text-[#1A1C1E]'
                      }`}
                    >
                      Knowledge Base ({knowledgeItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('snoozed_archived')}
                      className={`pb-2 border-b-2 transition-all tracking-wider font-semibold uppercase ${
                        activeTab === 'snoozed_archived'
                          ? 'border-[#B8422E] text-[#1A1C1E]'
                          : 'border-transparent text-[#6C7278] hover:text-[#1A1C1E]'
                      }`}
                    >
                      Snoozed & Archived ({snoozedItems.length + archivedItems.length})
                    </button>
                  </div>
                )}

                {/* DRAG AND DROP TARGET PANELS (Rendered contextually when dragging) */}
                {isDragging && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-6 gap-3 border-2 border-dashed border-[#6C7278]/60 p-4 bg-[#F7F5F2] rounded-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4">
                    <div
                      onDragOver={(e) => handleDragOver(e, 'task')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'task')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'task' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                      }`}
                    >
                      <FolderPlus className="h-4 w-4 text-[#6C7278]" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Convert Task</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'academy')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'academy')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'academy' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4 text-[#6C7278]" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Send Academy</span>
                    </div>
                    {draggedItem?.status === 'knowledge' ? (
                      <div
                        onDragOver={(e) => handleDragOver(e, 'unsorted')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'unsorted')}
                        className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          activeDropzone === 'unsorted' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                        }`}
                      >
                        <Inbox className="h-4 w-4 text-[#6C7278]" />
                        <span className="font-label text-xs uppercase tracking-wider font-semibold">Move to Queue</span>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => handleDragOver(e, 'knowledge')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'knowledge')}
                        className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          activeDropzone === 'knowledge' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-[#6C7278]" />
                        <span className="font-label text-xs uppercase tracking-wider font-semibold">Save Knowledge</span>
                      </div>
                    )}
                    <div
                      onDragOver={(e) => handleDragOver(e, 'snooze')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'snooze')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'snooze' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                      }`}
                    >
                      <Clock className="h-4 w-4 text-[#6C7278]" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Snooze 24h</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'archive')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'archive')}
                      className={`border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'archive' ? 'bg-[#1A1C1E] text-white border-[#1A1C1E]' : 'bg-white border-[#6C7278]/40 text-[#1A1C1E]'
                      }`}
                    >
                      <Archive className="h-4 w-4 text-[#6C7278]" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Archive</span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, 'delete')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'delete')}
                      className={`col-span-2 md:col-span-1 border p-3 text-center rounded-sm transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                        activeDropzone === 'delete' ? 'bg-[#B8422E] text-white border-[#B8422E]' : 'bg-white border-[#B8422E]/20 text-[#B8422E] border-[#B8422E]/40'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="font-label text-xs uppercase tracking-wider font-semibold">Delete</span>
                    </div>
                  </div>
                )}

                {/* Search Results rendering or Tab content renders */}
                {isSearching ? (
                  <div className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block">
                        Search Results ({globalSearchResults.length})
                      </span>
                    </div>
                    {renderInboxCards(globalSearchResults, "No items match your search query across all inboxes.")}
                  </div>
                ) : (
                  <>
                    {activeTab === 'queue' && (
                      <div className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block">
                            Pending Triage Queue ({unsortedItems.length})
                          </span>
                        </div>
                        {renderInboxCards(filteredUnsorted, "Triage queue is empty. Active items resolved.")}
                      </div>
                    )}

                    {activeTab === 'knowledge' && (
                      <div className="bg-white border border-[#6C7278] p-6 rounded-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block">
                            Knowledge Base & Permanent Reference Vault ({knowledgeItems.length})
                          </span>
                        </div>
                        {renderInboxCards(filteredKnowledge, "Knowledge Base is empty. Capture quotes, ideas, snippets, or links.")}
                      </div>
                    )}

                    {activeTab === 'snoozed_archived' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Snoozed Queue */}
                        <div className="bg-white border border-[#6C7278] p-5 rounded-sm">
                          <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-3 border-b border-[#6C7278]/25 pb-1">
                            Snoozed Queue ({snoozedItems.length})
                          </span>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredSnoozed.map((item) => (
                              <div key={item.id} className="flex justify-between items-center bg-[#F7F5F2] px-3 py-2 border border-[#6C7278]/20">
                                <span className="font-sans text-xs text-[#1A1C1E] truncate shrink-0 max-w-[150px]">{item.title}</span>
                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'unsorted');
                                    showToast('Item unsnoozed and returned to triage queue.', 'success');
                                  }}
                                  className="font-label text-xs text-[#B8422E] hover:underline uppercase tracking-wide cursor-pointer"
                                >
                                  Unsnooze
                                </button>
                              </div>
                            ))}
                            {filteredSnoozed.length === 0 && (
                              <p className="font-sans text-xs text-[#6C7278] italic text-center py-4">No snoozed items.</p>
                            )}
                          </div>
                        </div>

                        {/* Archived Queue */}
                        <div className="bg-white border border-[#6C7278] p-5 rounded-sm">
                          <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.15em] block mb-3 border-b border-[#6C7278]/25 pb-1">
                            Archived Log ({archivedItems.length})
                          </span>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredArchived.map((item) => (
                              <div key={item.id} className="flex justify-between items-center bg-[#F7F5F2] px-3 py-2 border border-[#6C7278]/20">
                                <span className="font-sans text-xs text-[#6C7278] truncate shrink-0 max-w-[150px]">{item.title}</span>
                                <button
                                  onClick={async () => {
                                    await updateInboxItemStatus(item.id, 'unsorted');
                                    showToast('Item restored from archive to triage queue.', 'success');
                                  }}
                                  className="font-label text-xs text-[#1A1C1E] hover:underline uppercase tracking-wide cursor-pointer"
                                >
                                  Restore
                                </button>
                              </div>
                            ))}
                            {filteredArchived.length === 0 && (
                              <p className="font-sans text-xs text-[#6C7278] italic text-center py-4">Archive is empty.</p>
                            )}
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
