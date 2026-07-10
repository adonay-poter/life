'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInbox } from '@/context/InboxContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/utils/supabaseClient';
import { INTAKE_IMAGES_BUCKET } from '@/utils/storage';
import { ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';
import { Textarea } from './ui/Inputs';

interface UniversalCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_LINK_SUMMARY = 'Saved link waiting for review.';
const DEFAULT_IMAGE_SUMMARY = 'Image capture waiting for review.';

function isProbablyUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(trimmed);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function deriveTitleFromText(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Quick capture';
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).trimEnd()}...`;
}

function deriveSummaryFromText(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return undefined;
  return cleaned.length <= 180 ? cleaned : `${cleaned.slice(0, 177).trimEnd()}...`;
}

function getHostnameTitle(rawUrl: string) {
  try {
    return new URL(normalizeUrl(rawUrl)).hostname.replace(/^www\./, '');
  } catch {
    return 'Saved link';
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export default function UniversalCaptureModal({ isOpen, onClose }: UniversalCaptureModalProps) {
  const { addInboxItem, updateInboxItem } = useInbox();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rawInput, setRawInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setRawInput('');
    setAttachmentFile(null);
    setAttachmentPreviewUrl('');
    setAttachmentName('');

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
        } else if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => textareaRef.current?.focus(), 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreviewUrl('');
    setAttachmentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAttachmentIfNeeded = async (file?: File | null) => {
    if (!file) {
      return { attachmentPath: '', fileName: '' };
    }
    if (!user) {
      throw new Error('You need to be signed in to upload an image.');
    }

    const sanitizedName = sanitizeFileName(file.name || 'capture-image');
    const storagePath = `${user.id}/${crypto.randomUUID()}-${sanitizedName}`;
    const { data, error } = await supabase.storage.from(INTAKE_IMAGES_BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    return { attachmentPath: data.path, fileName: file.name };
  };

  const enrichCapture = async (payload: { rawText?: string; attachmentUrl?: string; fileName?: string }) => {
    const response = await fetch('/api/capture/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to prepare capture.');
    }

    return data;
  };

  const enrichAndSaveCapture = async (payload?: { rawText?: string; attachmentFile?: File | null; fileName?: string }) => {
    const nextRawText = payload?.rawText ?? rawInput;
    const nextAttachmentFile = payload?.attachmentFile ?? attachmentFile;
    const nextFileName = payload?.fileName ?? attachmentName;

    if (!nextRawText.trim() && !nextAttachmentFile) {
      showToast('Paste text, a link, or an image to capture it.', 'error');
      return;
    }

    setLoading(true);
    try {
      const uploadedAttachment = await uploadAttachmentIfNeeded(nextAttachmentFile);
      const trimmedText = nextRawText.trim();
      const hasAttachment = Boolean(uploadedAttachment.attachmentPath);
      const isUrlCapture = !hasAttachment && isProbablyUrl(trimmedText);
      const storageType = hasAttachment ? 'photo' : isUrlCapture ? 'url' : 'text';
      const normalizedUrl = isUrlCapture ? normalizeUrl(trimmedText) : undefined;
      const provisionalTitle = hasAttachment
        ? (nextFileName || uploadedAttachment.fileName || 'Image capture')
        : isUrlCapture
          ? getHostnameTitle(trimmedText)
          : deriveTitleFromText(trimmedText);
      const provisionalSummary = hasAttachment
        ? DEFAULT_IMAGE_SUMMARY
        : isUrlCapture
          ? DEFAULT_LINK_SUMMARY
          : deriveSummaryFromText(trimmedText);
      const provisionalContent = hasAttachment || isUrlCapture ? undefined : trimmedText;

      const inboxItemId = await addInboxItem(
        storageType,
        provisionalTitle,
        normalizedUrl,
        provisionalContent,
        [],
        'unprocessed',
        undefined,
        {
          source_url: normalizedUrl,
          attachment_url: uploadedAttachment.attachmentPath || undefined,
          summary: provisionalSummary,
          ai_suggested_type: isUrlCapture || hasAttachment ? 'resource' : undefined,
          ai_suggested_action: isUrlCapture
            ? 'Review and sort this link later.'
            : hasAttachment
              ? 'Review the image and decide where it belongs.'
              : undefined,
        }
      );

      showToast(storageType === 'url' ? 'Link captured into Intake Inbox.' : 'Capture saved into Intake Inbox.', 'success');
      setRawInput('');
      clearAttachment();
      onClose();

      void enrichCapture({
        rawText: trimmedText,
        attachmentUrl: uploadedAttachment.attachmentPath,
        fileName: nextFileName || uploadedAttachment.fileName,
      })
        .then(async (data) => {
          await updateInboxItem(inboxItemId, {
            type: data.storageType,
            title: data.title,
            url: data.sourceUrl || undefined,
            source_url: data.sourceUrl || undefined,
            content: data.content || undefined,
            attachment_url: data.attachmentUrl || uploadedAttachment.attachmentPath || undefined,
            summary: data.summary || undefined,
            ai_suggested_type: data.aiSuggestedType || undefined,
            ai_suggested_action: data.aiSuggestedAction || undefined,
          });
        })
        .catch((err: any) => {
          console.warn('Background capture enrichment failed:', err);
        });
    } catch (err: any) {
      console.error('Failed to capture:', err);
      showToast(err.message || 'Failed to capture item.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await enrichAndSaveCapture();
  };

  const handleFileSelection = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are supported here.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showToast('Image is too large. Keep it under 2MB for intake capture.', 'error');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachmentFile(file);
      setAttachmentPreviewUrl(dataUrl);
      setAttachmentName(file.name);
    } catch (err: any) {
      showToast(err.message || 'Failed to read image.', 'error');
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const imageFile = Array.from(e.clipboardData.files).find((file) => file.type.startsWith('image/'));

    if (imageFile) {
      e.preventDefault();
      await handleFileSelection(imageFile);
      return;
    }

    if (pastedText && isProbablyUrl(pastedText)) {
      e.preventDefault();
      setRawInput(pastedText.trim());
      await enrichAndSaveCapture({ rawText: pastedText.trim(), attachmentFile: null, fileName: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-backdrop"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-modal-title"
        className="animate-modal relative flex w-full max-w-2xl flex-col space-y-6 rounded-[28px] border border-primary/20 bg-surface p-6 shadow-[0_28px_80px_rgba(26,28,30,0.2)] md:p-8"
      >
        <button
          onClick={onClose}
          className="btn-press absolute right-4 top-4 rounded-xl p-2 text-secondary transition-colors hover:bg-neutral-bg hover:text-primary"
          title="Close Modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <div className="rounded-2xl border border-accent/20 bg-accent/10 p-2 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3
              id="capture-modal-title"
              className="font-display text-2xl font-bold tracking-[-0.03em] text-primary md:text-[2rem]"
            >
              Quick Capture
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Capture the raw thing now. Sorting and enrichment can happen later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cap-raw-input" className="block font-label text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">
              Paste text, quotes, ideas, or links
            </label>
            <Textarea
              ref={textareaRef}
              id="cap-raw-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="Drop the raw thing here. A pasted link files itself automatically."
              rows={7}
              className="bg-neutral-bg text-sm resize-none min-h-[180px]"
            />
            <p className="text-sm text-secondary">
              Titles, metadata, and AI suggestions are inferred for you. Review happens later.
            </p>
          </div>

          <div className="app-panel-subtle p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ImagePlus className="h-4 w-4 text-accent" />
                <span>Add an image</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFileSelection(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs font-label uppercase tracking-[0.16em] text-primary transition-colors cursor-pointer hover:border-accent"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Image
              </button>
            </div>

            {attachmentPreviewUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-secondary">
                  <span className="truncate">{attachmentName || 'Image capture ready'}</span>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="btn-press rounded-xl px-2 py-1 text-primary transition-colors cursor-pointer hover:bg-surface hover:text-accent"
                  >
                    Remove
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentPreviewUrl}
                  alt={attachmentName || 'Capture preview'}
                  className="max-h-48 w-full rounded-[18px] border border-border bg-surface object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="border-t border-border pt-3">
            <div className="grid w-full grid-cols-2 gap-3">
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Capturing...' : 'Capture'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
