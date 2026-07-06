'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInbox } from '@/context/InboxContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/utils/supabaseClient';
import { INTAKE_IMAGES_BUCKET } from '@/utils/storage';
import { ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';

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
        className="animate-modal relative bg-surface border-2 border-primary p-6 md:p-8 max-w-xl w-full shadow-2xl rounded-none flex flex-col space-y-5"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-secondary hover:text-primary p-1 cursor-pointer transition-colors btn-press"
          title="Close Modal"
        >
          <X className="h-5 w-5" />
        </button>

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
            Paste first. Categorize later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cap-raw-input" className="block font-label text-[10px] uppercase tracking-wider text-secondary font-bold">
              Paste text, quotes, ideas, or links
            </label>
            <textarea
              ref={textareaRef}
              id="cap-raw-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="Drop the raw thing here. A pasted link files itself automatically."
              rows={7}
              className="w-full bg-neutral-bg border border-border px-3 py-3 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors resize-none"
            />
            <p className="font-sans text-xs text-secondary">
              Titles, metadata, and AI suggestions are inferred for you. Review happens later.
            </p>
          </div>

          <div className="border border-dashed border-border p-3 space-y-3 bg-neutral-bg/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-primary">
                <ImagePlus className="h-4 w-4 text-accent" />
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
                className="inline-flex w-full items-center justify-center gap-2 border border-border px-3 py-2 text-xs font-label uppercase tracking-wider text-primary hover:border-accent transition-colors cursor-pointer"
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
                    className="text-primary hover:text-accent transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentPreviewUrl}
                  alt={attachmentName || 'Capture preview'}
                  className="max-h-48 w-full object-contain border border-border bg-surface"
                />
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-3 border-t border-border font-label text-xs uppercase tracking-wider font-bold">
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
