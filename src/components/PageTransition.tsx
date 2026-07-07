'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * PageTransition
 *
 * Uses `key={pathname}` to force React to unmount + remount this node
 * every time the route changes, which re-triggers the `animate-page-enter`
 * CSS animation on every navigation — including mobile tab switches.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={`animate-page-enter flex-1 flex flex-col min-w-0 ${
        pathname.startsWith('/oracle') ? 'min-h-0' : 'min-h-screen'
      }`}
    >
      {children}
    </div>
  );
}
