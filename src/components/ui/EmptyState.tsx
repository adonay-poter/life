'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-border bg-surface/50 rounded-none w-full max-w-md mx-auto my-4">
      <h4 className="font-display text-lg font-bold text-primary mb-2">
        {title}
      </h4>
      <p className="font-sans text-xs text-secondary max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
