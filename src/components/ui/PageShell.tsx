'use client';

import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`space-y-8 md:space-y-10 animate-page-enter max-w-6xl mx-auto w-full pb-16 ${className}`}>
      {children}
    </div>
  );
}
