'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType
}: ConfirmDeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        );
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
    
    // Set initial focus to cancel button to prevent accidental trigger
    const cancelButton = modalRef.current?.querySelector('[data-autofocus]') as HTMLElement;
    cancelButton?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-backdrop" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="animate-modal relative flex w-full max-w-md flex-col space-y-5 rounded-[28px] border border-primary/20 bg-surface p-6 shadow-[0_28px_80px_rgba(26,28,30,0.2)]"
      >
        <div className="flex items-start space-x-3">
          <div className="shrink-0 rounded-2xl border border-danger/20 bg-danger/8 p-2.5 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 
              id="delete-modal-title"
              className="font-display text-2xl font-bold tracking-[-0.03em] text-primary"
            >
              Confirm Deletion
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Are you sure you want to permanently delete the {itemType} <strong className="text-primary font-semibold">"{itemName}"</strong>? This action is irreversible.
            </p>
          </div>
        </div>

        <div className="app-panel-subtle flex flex-col gap-3 px-4 py-4 sm:flex-row sm:justify-end">
          <SecondaryButton
            type="button"
            data-autofocus
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant="danger"
            className="w-full sm:w-auto"
          >
            Delete
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
