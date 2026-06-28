import React from 'react';

export default function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col font-sans p-6 md:p-12 animate-pulse">
      {/* Top Header */}
      <header className="border-b border-secondary pb-6 mb-8 flex justify-between items-end">
        <div>
          <div className="h-4 w-24 bg-secondary/20 rounded mb-2"></div>
          <div className="h-10 w-64 bg-primary/20 rounded"></div>
        </div>
        <div className="h-8 w-8 bg-secondary/20 rounded"></div>
      </header>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-surface border border-secondary/40 p-6 rounded-lg space-y-4">
            <div className="h-6 w-1/3 bg-primary/20 rounded"></div>
            <div className="h-4 w-full bg-secondary/10 rounded"></div>
            <div className="h-4 w-5/6 bg-secondary/10 rounded"></div>
            <div className="h-4 w-4/6 bg-secondary/10 rounded"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-surface border border-secondary/40 p-6 rounded-lg space-y-3">
              <div className="h-5 w-1/2 bg-primary/20 rounded"></div>
              <div className="h-3 w-3/4 bg-secondary/10 rounded"></div>
              <div className="h-8 w-full bg-secondary/10 rounded mt-4"></div>
            </div>
            <div className="bg-surface border border-secondary/40 p-6 rounded-lg space-y-3">
              <div className="h-5 w-1/2 bg-primary/20 rounded"></div>
              <div className="h-3 w-3/4 bg-secondary/10 rounded"></div>
              <div className="h-8 w-full bg-secondary/10 rounded mt-4"></div>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="space-y-8">
          <div className="bg-surface border border-secondary/40 p-6 rounded-lg space-y-4">
            <div className="h-5 w-2/3 bg-primary/20 rounded"></div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-secondary/10 rounded"></div>
              <div className="h-3 w-full bg-secondary/10 rounded"></div>
              <div className="h-3 w-5/6 bg-secondary/10 rounded"></div>
            </div>
          </div>

          <div className="bg-surface border border-secondary/40 p-6 rounded-lg space-y-4">
            <div className="h-5 w-1/2 bg-primary/20 rounded"></div>
            <div className="flex space-x-2">
              <div className="h-10 w-10 bg-secondary/20 rounded-full"></div>
              <div className="h-10 w-10 bg-secondary/20 rounded-full"></div>
              <div className="h-10 w-10 bg-secondary/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
