'use client';

import React from 'react';

interface EditorialCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function EditorialCard({ children, title, subtitle, action, className = '', style }: EditorialCardProps) {
  return (
    <article 
      className={`app-panel relative flex flex-col justify-start overflow-hidden p-5 sm:p-6 ${className}`}
      style={style}
    >
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h3 className="font-display text-xl font-bold leading-tight text-primary sm:text-[1.55rem]">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="mt-2 block text-sm leading-relaxed text-secondary">
                {subtitle}
              </span>
            )}
          </div>
          {action && <div className="sm:shrink-0">{action}</div>}
        </div>
      )}
      <div className="flex-1 w-full">{children}</div>
    </article>
  );
}
