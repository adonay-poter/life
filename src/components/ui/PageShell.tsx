'use client';

import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`space-y-6 md:space-y-8 animate-page-enter max-w-[1180px] mx-auto w-full pb-20 ${className}`}>
      {children}
    </div>
  );
}
