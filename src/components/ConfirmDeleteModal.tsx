'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

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
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="relative bg-surface border-2 border-primary p-6 max-w-sm w-full shadow-2xl rounded-none flex flex-col space-y-4"
      >
        <div className="flex items-start space-x-3">
          <div className="bg-[#FFEBEE] p-2 text-tertiary shrink-0 border border-[#FFCDD2]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 
              id="delete-modal-title"
              className="font-display text-lg font-bold text-primary uppercase tracking-wide"
            >
              Confirm Deletion
            </h3>
            <p className="font-sans text-xs text-secondary mt-1 leading-relaxed">
              Are you sure you want to permanently delete the {itemType} <strong className="text-primary font-semibold">"{itemName}"</strong>? This action is irreversible.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2 font-label text-xs uppercase tracking-wider font-bold">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="px-4 py-2 border border-secondary text-primary hover:bg-neutral-bg transition-colors rounded-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-tertiary text-on-primary hover:bg-tertiary/90 transition-colors border border-tertiary rounded-sm cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
