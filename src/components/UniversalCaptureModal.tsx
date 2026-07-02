'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useToast } from '@/context/ToastContext';
import { X, Sparkles, Plus, Link2, Paperclip, HelpCircle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';

interface UniversalCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAPTURE_TYPES = [
  { value: 'thought', label: 'Thought' },
  { value: 'idea', label: 'Idea' },
  { value: 'task', label: 'Task' },
  { value: 'url', label: 'Link / URL' },
  { value: 'photo', label: 'Photo' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code Snippet' },
  { value: 'question', label: 'Question' },
  { value: 'journal', label: 'Journal Slip' },
  { value: 'book_note', label: 'Book Note' },
  { value: 'course_note', label: 'Course Note' },
  { value: 'decision', label: 'Decision' },
  { value: 'resource', label: 'Resource Reference' },
];

export default function UniversalCaptureModal({ isOpen, onClose }: UniversalCaptureModalProps) {
  const { addInboxItem, projects } = useDashboard();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<any>('thought');
  const [sourceUrl, setSourceUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus trap & Escape close
  useEffect(() => {
    if (!isOpen) return;

    // Reset fields on open
    setTitle('');
    setContent('');
    setType('thought');
    setSourceUrl('');
    setAttachmentUrl('');
    setProjectId('');
    setTags('');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Autofocus title input
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Capture slip requires a title.', 'error');
      return;
    }

    setLoading(true);
    try {
      let finalUrl = sourceUrl.trim();
      if (type === 'url' || type === 'resource') {
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
      }

      const tagsArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      const extraFields = {
        source_url: finalUrl || undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        summary: content.slice(0, 150) || undefined
      };

      await addInboxItem(
        type,
        title.trim(),
        finalUrl || undefined,
        content.trim() || undefined,
        tagsArray,
        'unprocessed',
        projectId || undefined,
        extraFields
      );

      showToast('Slip captured into Intake Inbox.', 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to capture:', err);
      showToast(err.message || 'Failed to capture item.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeProjects = projects.filter((p) => !p.is_archived);

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      {/* Backdrop with slight blur */}
      <div 
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-backdrop" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-modal-title"
        className="animate-modal relative bg-surface border-2 border-primary p-6 md:p-8 max-w-xl w-full shadow-2xl rounded-none flex flex-col space-y-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-secondary hover:text-primary p-1 cursor-pointer transition-colors btn-press"
          title="Close Modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-accent/10 p-1.5 text-accent border border-accent/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 
              id="capture-modal-title"
              className="font-display text-lg md:text-xl font-bold text-primary uppercase tracking-wide"
            >
              Universal Intake Capture
            </h3>
          </div>
          <p className="font-sans text-[11px] text-secondary mt-1 uppercase tracking-wider">
            Slip-based thought ledger • Save directly to Inbox Queue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="cap-title" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
                Slip Title / Headline
              </label>
              <input
                ref={titleInputRef}
                id="cap-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is on your mind?"
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors"
              />
            </div>

            {/* Type Selector */}
            <div className="space-y-1">
              <label htmlFor="cap-type" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
                Capture Category
              </label>
              <select
                id="cap-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none cursor-pointer transition-colors"
              >
                {CAPTURE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Project Selection */}
            <div className="space-y-1">
              <label htmlFor="cap-project" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
                Link to Project (Optional)
              </label>
              <select
                id="cap-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none cursor-pointer transition-colors"
              >
                <option value="">No Project</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Source URL / Link */}
            <div className="space-y-1">
              <label htmlFor="cap-url" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
                <Link2 className="h-3 w-3 text-secondary" />
                <span>Reference URL (Optional)</span>
              </label>
              <input
                id="cap-url"
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors"
              />
            </div>

            {/* Attachment URL */}
            <div className="space-y-1">
              <label htmlFor="cap-attach" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
                <Paperclip className="h-3 w-3 text-secondary" />
                <span>Attachment Link (Optional)</span>
              </label>
              <input
                id="cap-attach"
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Direct image or file URL"
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="cap-tags" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
                Tags (comma separated)
              </label>
              <input
                id="cap-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="ideas, reads, design"
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors"
              />
            </div>

            {/* Description/Content */}
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="cap-content" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
                Content Notes / Code / Quotes
              </label>
              <textarea
                id="cap-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your notes, quotes, or snippets here..."
                rows={4}
                className="w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border font-label text-xs uppercase tracking-wider font-bold">
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Filing Slip...' : 'File Slip to Intake'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
