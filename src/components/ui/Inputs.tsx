'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block font-label text-xs uppercase tracking-wider text-secondary font-bold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors placeholder:text-secondary/60 ${
            error ? 'border-danger' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger font-label uppercase font-semibold">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block font-label text-xs uppercase tracking-wider text-secondary font-bold">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-neutral-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors resize-y min-h-[100px] placeholder:text-secondary/60 ${
            error ? 'border-danger' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger font-label uppercase font-semibold">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block font-label text-xs uppercase tracking-wider text-secondary font-bold">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-surface border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-accent font-sans rounded-none transition-colors cursor-pointer ${
            error ? 'border-danger' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-danger font-label uppercase font-semibold">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
