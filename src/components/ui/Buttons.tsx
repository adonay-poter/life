'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const bgClass = variant === 'primary' 
    ? 'bg-accent text-on-accent hover:opacity-90' 
    : 'bg-danger text-on-accent hover:opacity-90';
    
  return (
    <button
      className={`btn-press px-4 py-2.5 text-xs font-label uppercase font-bold tracking-widest rounded-none border border-transparent cursor-pointer transition-all duration-200 select-none flex items-center justify-center gap-2 ${bgClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`btn-press px-4 py-2.5 text-xs font-label uppercase font-bold tracking-widest rounded-none bg-surface border border-border text-primary hover:border-primary cursor-pointer transition-all duration-200 select-none flex items-center justify-center gap-2 ${className}`}
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
      className={`btn-press p-2 rounded-none hover:bg-background border border-transparent hover:border-border text-secondary hover:text-primary transition-all duration-200 cursor-pointer flex items-center justify-center ${className}`}
      title={title}
      aria-label={title}
      {...props}
    >
      {children}
    </button>
  );
}
