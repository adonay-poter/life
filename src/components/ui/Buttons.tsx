'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const bgClass = variant === 'primary' 
    ? 'bg-accent text-on-accent hover:opacity-95 hover:shadow-[0_14px_28px_rgba(184,66,46,0.22)]' 
    : 'bg-danger text-on-accent hover:opacity-95 hover:shadow-[0_14px_28px_rgba(166,58,43,0.22)]';
    
  return (
    <button
      className={`btn-press min-h-11 rounded-2xl px-4 py-2.5 text-xs font-label uppercase font-bold tracking-[0.18em] border border-transparent cursor-pointer transition-all duration-200 select-none inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(26,28,30,0.08)] ${bgClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`btn-press min-h-11 rounded-2xl px-4 py-2.5 text-xs font-label uppercase font-bold tracking-[0.18em] bg-surface border border-border text-primary hover:border-primary hover:bg-surface-muted cursor-pointer transition-all duration-200 select-none inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  title: string;
}

export function IconButton({ children, className = '', title, ...props }: IconButtonProps) {
  return (
    <button
      className={`btn-press h-10 w-10 rounded-xl hover:bg-surface-muted border border-transparent hover:border-border text-secondary hover:text-primary transition-all duration-200 cursor-pointer inline-flex items-center justify-center ${className}`}
      title={title}
      aria-label={title}
      {...props}
    >
      {children}
    </button>
  );
}
