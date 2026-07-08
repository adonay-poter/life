'use client';

import React from 'react';
import PageShell from './PageShell';
import { SecondaryButton, PrimaryButton } from './Buttons';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface ReviewFlowShellProps {
  title: string;
  subtitle: string;
  steps: string[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete?: () => void;
  isCompleteDisabled?: boolean;
  children: React.ReactNode;
}

export default function ReviewFlowShell({
  title,
  subtitle,
  steps,
  currentStep,
  onNext,
  onPrev,
  onComplete,
  isCompleteDisabled = false,
  children
}: ReviewFlowShellProps) {
  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6 py-2 sm:space-y-8">
        {/* Wizard Header */}
        <div className="app-panel flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-kicker">Guided Review</p>
              <h1 className="mt-2 font-display text-[2rem] font-bold tracking-[-0.04em] text-primary sm:text-[2.5rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                {subtitle}
              </p>
            </div>
            <div className="app-panel-subtle px-3 py-2">
              <span className="app-kicker text-primary">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <div
                  key={idx}
                  className={`shrink-0 rounded-2xl border px-3 py-2 transition-all ${
                    isActive
                      ? 'border-accent/30 bg-accent/8'
                      : isCompleted
                      ? 'border-success/30 bg-success/8'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border font-label text-[10px] font-bold ${
                        isActive
                          ? 'border-accent bg-accent text-on-accent'
                          : isCompleted
                          ? 'border-success bg-success/15 text-success'
                          : 'border-border bg-surface text-secondary'
                      }`}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                    </span>
                    <span
                      className={`font-label text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        isActive ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-secondary/70'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="app-panel min-h-[360px] p-5 sm:p-8 animate-page-enter">
          {children}
        </div>

        {/* Step Navigation Controls */}
        <div className="app-panel-subtle flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <SecondaryButton
            type="button"
            onClick={onPrev}
            disabled={isFirstStep}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </SecondaryButton>

          {isLastStep ? (
            <PrimaryButton
              type="button"
              onClick={onComplete}
              disabled={isCompleteDisabled}
              className="w-full sm:w-auto"
            >
              <span>Complete Review</span>
              <Check className="h-4 w-4" />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto"
            >
              <span>Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </PageShell>
  );
}
