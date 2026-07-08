'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'priority' | 'status' | 'category' | 'default';
  className?: string;
}

export default function StatusBadge({ status, type = 'default', className = '' }: StatusBadgeProps) {
  let badgeStyle = 'border border-border text-secondary bg-surface';
  
  const statusClean = status.toLowerCase().trim();

  if (type === 'priority') {
    if (statusClean === 'high' || statusClean === 'urgent') {
      badgeStyle = 'border border-accent/45 text-accent bg-accent/5 font-bold';
    } else if (statusClean === 'medium') {
      badgeStyle = 'border border-primary/30 text-primary bg-background';
    } else {
      badgeStyle = 'border border-border text-secondary bg-background/50';
    }
  } else if (type === 'status') {
    if (statusClean === 'done' || statusClean === 'completed') {
      badgeStyle = 'border border-success/40 text-success bg-success/5';
    } else if (statusClean === 'in_progress' || statusClean === 'doing' || statusClean === 'active' || statusClean === 'in progress') {
      badgeStyle = 'border border-accent/45 text-accent bg-accent/5';
    } else if (statusClean === 'backlog') {
      badgeStyle = 'border border-border text-secondary bg-background/40';
    } else {
      badgeStyle = 'border border-primary/30 text-primary bg-surface';
    }
  } else if (type === 'category') {
    badgeStyle = 'border border-border text-secondary bg-neutral-bg';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-label text-[10px] sm:text-[11px] tracking-[0.18em] uppercase font-semibold select-none ${badgeStyle} ${className}`}>
      {status}
    </span>
  );
}
