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
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Wizard Header */}
        <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary tracking-tight">
              {title}
            </h1>
            <p className="font-sans text-xs text-secondary mt-1 uppercase tracking-wider">
              {subtitle}
            </p>
          </div>
          <div className="font-label text-xs font-semibold text-secondary uppercase shrink-0">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between font-label text-[10px] uppercase font-bold text-secondary gap-2 border-b border-border/40 pb-4 overflow-x-auto no-scrollbar">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <div key={idx} className="flex items-center space-x-2 shrink-0">
                <span
                  className={`w-5 h-5 flex items-center justify-center border font-label text-[9px] ${
                    isActive
                      ? 'border-accent bg-accent text-on-accent'
                      : isCompleted
                      ? 'border-success bg-success/15 text-success'
                      : 'border-border bg-surface text-secondary'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <span className={isActive ? 'text-primary' : isCompleted ? 'text-secondary/70' : 'text-secondary/40'}>
                  {step}
                </span>
                {idx < totalSteps - 1 && <span className="text-secondary/20">/</span>}
              </div>
            );
          })}
        </div>

        {/* Step Content Area */}
        <div className="min-h-[350px] bg-surface border border-border p-6 sm:p-8 animate-page-enter">
          {children}
        </div>

        {/* Step Navigation Controls */}
        <div className="flex justify-between items-center font-label text-xs font-bold pt-4 border-t border-border">
          <SecondaryButton
            type="button"
            onClick={onPrev}
            disabled={isFirstStep}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>PREVIOUS</span>
          </SecondaryButton>

          {isLastStep ? (
            <PrimaryButton
              type="button"
              onClick={onComplete}
              disabled={isCompleteDisabled}
              className="flex items-center gap-1.5"
            >
              <span>COMPLETE REVIEW</span>
              <Check className="h-4 w-4" />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              type="button"
              onClick={onNext}
              className="flex items-center gap-1.5"
            >
              <span>NEXT STEP</span>
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </PageShell>
  );
}
