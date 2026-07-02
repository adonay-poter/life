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
      className={`bg-surface border border-border p-6 rounded-none relative flex flex-col justify-start ${className}`}
      style={style}
    >
      {(title || subtitle || action) && (
        <div className="flex justify-between items-baseline mb-4 pb-2 border-b border-border w-full">
          <div>
            {title && (
              <h3 className="font-display text-lg font-bold text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="font-label text-xs text-secondary uppercase tracking-wider block mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 w-full">{children}</div>
    </article>
  );
}
