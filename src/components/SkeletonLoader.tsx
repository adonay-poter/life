import React from 'react';

export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col font-sans p-4 md:p-10 animate-pulse">
      {/* Top Header */}
      <header className="app-panel mb-6 flex items-end justify-between px-5 py-5 md:px-6 md:py-6">
        <div>
          <div className="mb-2 h-4 w-24 rounded-xl bg-secondary/20"></div>
          <div className="h-10 w-64 rounded-[18px] bg-primary/20"></div>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-secondary/20"></div>
      </header>

      {/* Grid Content */}
      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 md:col-span-2">
          <div className="app-panel space-y-4 p-6">
            <div className="h-6 w-1/3 rounded-xl bg-primary/20"></div>
            <div className="h-4 w-full rounded-xl bg-secondary/10"></div>
            <div className="h-4 w-5/6 rounded-xl bg-secondary/10"></div>
            <div className="h-4 w-4/6 rounded-xl bg-secondary/10"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="app-panel space-y-3 p-6">
              <div className="h-5 w-1/2 rounded-xl bg-primary/20"></div>
              <div className="h-3 w-3/4 rounded-xl bg-secondary/10"></div>
              <div className="mt-4 h-8 w-full rounded-2xl bg-secondary/10"></div>
            </div>
            <div className="app-panel space-y-3 p-6">
              <div className="h-5 w-1/2 rounded-xl bg-primary/20"></div>
              <div className="h-3 w-3/4 rounded-xl bg-secondary/10"></div>
              <div className="mt-4 h-8 w-full rounded-2xl bg-secondary/10"></div>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          <div className="app-panel space-y-4 p-6">
            <div className="h-5 w-2/3 rounded-xl bg-primary/20"></div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded-xl bg-secondary/10"></div>
              <div className="h-3 w-full rounded-xl bg-secondary/10"></div>
              <div className="h-3 w-5/6 rounded-xl bg-secondary/10"></div>
            </div>
          </div>

          <div className="app-panel space-y-4 p-6">
            <div className="h-5 w-1/2 rounded-xl bg-primary/20"></div>
            <div className="flex space-x-2">
              <div className="h-10 w-10 rounded-2xl bg-secondary/20"></div>
              <div className="h-10 w-10 rounded-2xl bg-secondary/20"></div>
              <div className="h-10 w-10 rounded-2xl bg-secondary/20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
