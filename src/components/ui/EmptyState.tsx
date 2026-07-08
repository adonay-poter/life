'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="app-panel-subtle text-center py-14 px-6 w-full max-w-lg mx-auto my-4">
      <p className="app-kicker mb-3">Nothing here yet</p>
      <h4 className="font-display text-2xl font-bold text-primary mb-3">
        {title}
      </h4>
      <p className="font-sans text-sm text-secondary max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
