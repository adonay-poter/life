import React, { useState, useEffect, useRef } from 'react';
import { Course } from '@/context/DashboardContext';
import { Search, Loader2, CheckCircle, AlertCircle, ChevronDown, Activity, Minimize2 } from 'lucide-react';
import { useRateLimit, LIMITS } from '@/hooks/useRateLimit';
import { useResearch } from '@/context/ResearchContext';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Buttons';
import { Input } from '@/components/ui/Inputs';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (courseId: string) => void;
  courses: Course[];
}

export default function ResearchModal({
  isOpen,
  onClose,
  onComplete,
  courses
}: ResearchModalProps) {
  const [topic, setTopic] = useState('');
  const [existingCourseId, setExistingCourseId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentRPD, currentRPM, currentTPM, isRateLimited } = useRateLimit();
  
  const { 
    status, 
    progress, 
    progressMsg, 
    errorMsg, 
    startResearch, 
    resetResearch 
  } = useResearch();

  // Close dropdown on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // When successfully complete, close after a delay if it is still open
  useEffect(() => {
    if (status === 'success' && isOpen) {
      const timer = setTimeout(() => {
        onComplete('');
        onClose();
        resetResearch();
        setTopic('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, isOpen, onComplete, onClose, resetResearch]);

  if (!isOpen) return null;

  const handleStartResearch = () => {
    startResearch(topic, existingCourseId, selectedModel);
  };

  const handleClose = () => {
    // If running, we don't reset, we just close the modal
    if (status !== 'running') {
      resetResearch();
      setTopic('');
    }
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/25 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
    >
      <div className="app-panel max-w-xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-[linear-gradient(135deg,rgba(184,66,46,0.12),rgba(26,28,30,0.04)_55%,rgba(26,28,30,0.01))] px-6 py-5">
          <h2 className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Search className="w-4 h-4 text-accent" />
            Research Agent
          </h2>
          <button onClick={handleClose} className="btn-press rounded-xl p-2 text-secondary hover:bg-surface hover:text-primary text-2xl font-light leading-none cursor-pointer">×</button>
        </div>

        {/* Body */}
        <div className="p-6">
          {status === 'idle' ? (
            <div className="space-y-5">
              <div>
                <label className="block font-label text-xs text-secondary mb-2 uppercase tracking-wide font-bold">
                  Topic to Research
                </label>
                <Input
                  type="text"
                  placeholder="e.g., The Cynics of Ancient Greece"
                  className="bg-neutral-bg text-sm"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isRateLimited && handleStartResearch()}
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-label text-xs text-secondary mb-2 uppercase tracking-wide font-bold">
                  AI Model
                </label>
                <div className="flex rounded-[20px] bg-background border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-2.5-flash')}
                    className={`btn-press flex-grow rounded-2xl px-4 py-2.5 text-xs font-sans font-bold transition-colors cursor-pointer ${
                      selectedModel === 'gemini-2.5-flash'
                        ? 'bg-primary text-on-primary'
                        : 'text-secondary hover:text-primary hover:bg-neutral-bg/50'
                    }`}
                  >
                    Gemini 2.5 Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    className={`btn-press flex-grow rounded-2xl px-4 py-2.5 text-xs font-sans font-bold transition-colors cursor-pointer ${
                      selectedModel === 'gemini-3.5-flash'
                        ? 'bg-primary text-on-primary'
                        : 'text-secondary hover:text-primary hover:bg-neutral-bg/50'
                    }`}
                  >
                    Gemini 3.5 Flash
                  </button>
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block font-label text-xs text-secondary mb-2 uppercase tracking-wide font-bold">
                  Destination
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex w-full items-center justify-between rounded-[20px] border border-border bg-neutral-bg px-4 py-3 font-sans text-sm tracking-wide text-primary cursor-pointer transition-all duration-200 hover:border-primary focus:border-primary focus:ring-0 outline-none"
                >
                  <span className="truncate font-semibold">
                    {existingCourseId === "" 
                      ? "+ Create Brand New Course" 
                      : `Add to: ${courses.find(c => c.id === existingCourseId)?.title || ''}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-secondary transition-transform duration-200 shrink-0 ml-2 ${dropdownOpen ? 'rotate-180 text-accent' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-[20px] border border-border bg-surface py-1 shadow-[0_20px_40px_rgba(26,28,30,0.12)] font-sans text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setExistingCourseId("");
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-bold transition-colors cursor-pointer ${
                        existingCourseId === "" 
                          ? "bg-primary text-on-primary" 
                          : "text-primary hover:bg-neutral-bg/60"
                      }`}
                    >
                      <span>+ Create Brand New Course</span>
                    </button>
                    {courses.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setExistingCourseId(c.id);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${
                          existingCourseId === c.id 
                            ? "bg-primary text-on-primary font-bold" 
                            : "text-primary hover:bg-neutral-bg/60"
                        }`}
                      >
                        <span className="truncate">Add to: {c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                {isRateLimited && (
                  <div className="mb-3 flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent/10 p-3 text-accent text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Daily or minute API limit reached. Please wait before generating again.</p>
                  </div>
                )}
                <PrimaryButton
                  onClick={handleStartResearch}
                  disabled={!topic.trim() || isRateLimited}
                  className="w-full py-3"
                >
                  <Search className="w-4 h-4" />
                  START RESEARCH
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-6 text-center">
              {status === 'running' && (
                <>
                  <Loader2 className="w-12 h-12 text-accent animate-spin" />
                  <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full border border-border bg-neutral-bg">
                    <div 
                      className="h-full rounded-full bg-accent transition-all duration-300 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-primary">{progress}%</h3>
                    <p className="font-sans text-xs text-secondary mt-2 animate-pulse font-semibold">{progressMsg}</p>
                  </div>
                  <SecondaryButton
                    onClick={onClose}
                    className="mt-6"
                  >
                    <Minimize2 className="w-4 h-4" />
                    Minimize to Background
                  </SecondaryButton>
                </>
              )}
              
              {status === 'success' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-border bg-emerald-800/10 text-emerald-800">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-primary">Research Complete</h3>
                    <p className="font-sans text-xs text-secondary mt-1 font-semibold">Redirecting to course...</p>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-border bg-accent/10 text-accent">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-primary">Research Failed</h3>
                    <p className="font-sans text-xs text-secondary mt-2 max-w-xs mx-auto break-words font-semibold">{errorMsg}</p>
                  </div>
                  <SecondaryButton 
                    onClick={resetResearch}
                    className="mt-4"
                  >
                    Try Again
                  </SecondaryButton>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Rate Limit Display */}
        <div className="flex items-center justify-between border-t border-border bg-surface px-6 py-4 text-[10px] uppercase font-sans tracking-widest font-bold">
          <div className="flex items-center gap-1.5 text-secondary">
            <Activity className="w-3 h-3 text-accent" />
            <span>API Usage</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={currentRPM >= LIMITS.RPM ? 'text-accent font-bold' : 'text-secondary'}>
              {currentRPM}/{LIMITS.RPM} RPM
            </span>
            <span className={currentTPM >= LIMITS.TPM ? 'text-accent font-bold' : 'text-secondary'}>
              {(currentTPM / 1000).toFixed(1)}k/{(LIMITS.TPM / 1000).toFixed(0)}k TPM
            </span>
            <span className={currentRPD >= LIMITS.RPD ? 'text-accent font-bold' : 'text-primary font-bold'}>
              {currentRPD}/{LIMITS.RPD} Daily
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
