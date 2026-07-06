'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/oracle', label: 'Workspace' },
  { href: '/oracle/conversations', label: 'Conversations' },
  { href: '/oracle/context', label: 'Context' },
];

export default function OraclePageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border border-border bg-neutral-bg/70 p-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-3 text-xs font-label uppercase tracking-[0.24em] transition-colors ${
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-primary hover:bg-surface'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
