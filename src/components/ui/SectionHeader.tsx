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
    <header className="app-panel px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between w-full">
      <div className="min-w-0">
        {(subtitle || meta) && (
          <p className="app-kicker mb-2">
            {meta || subtitle}
          </p>
        )}
        <h2 className="font-display text-[2rem] leading-none font-bold tracking-[-0.04em] text-primary sm:text-[2.5rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary sm:text-[0.96rem]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
        {meta && (
          <div className="app-panel-subtle px-3 py-2">
            <span className="app-kicker text-primary">{meta}</span>
          </div>
        )}
        {action && <div className="w-full md:w-auto">{action}</div>}
      </div>
    </header>
  );
}
