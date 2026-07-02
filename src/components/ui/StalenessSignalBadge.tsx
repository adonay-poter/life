'use client';

import React from 'react';

interface StalenessSignalBadgeProps {
  severity: 'low' | 'medium' | 'high';
  className?: string;
}

export default function StalenessSignalBadge({ severity, className = '' }: StalenessSignalBadgeProps) {
  let badgeStyle = 'border border-border text-secondary bg-surface';
  let label = 'Needs Review';

  if (severity === 'high') {
    badgeStyle = 'border border-danger/45 text-danger bg-danger/5 font-bold';
    label = 'Action Needed';
  } else if (severity === 'medium') {
    badgeStyle = 'border border-warning/45 text-warning bg-warning/5 font-medium';
    label = 'Stale';
  } else if (severity === 'low') {
    badgeStyle = 'border border-border text-secondary bg-background/50';
    label = 'Quiet Loop';
  }

  return (
    <span className={`inline-block font-label text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-none select-none ${badgeStyle} ${className}`}>
      {label}
    </span>
  );
}
