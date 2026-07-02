'use client';

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  meta?: string;
}

export default function SectionHeader({ title, subtitle, action, meta }: SectionHeaderProps) {
  return (
    <header className="border-b-2 border-primary pb-4 flex flex-col md:flex-row justify-between items-baseline gap-4 w-full">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="font-label text-xs text-secondary uppercase tracking-[0.2em] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-3 self-stretch md:self-auto justify-between md:justify-end">
        {meta && (
          <div className="font-label text-xs text-primary font-medium tracking-wider">
            {meta}
          </div>
        )}
        {action && (
          <div className={meta ? 'pl-3 border-l border-border' : ''}>
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
