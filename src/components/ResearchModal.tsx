import React, { useState, useEffect, useRef } from 'react';
import { Course } from '@/context/DashboardContext';
import { Search, Loader2, CheckCircle, AlertCircle, ChevronDown, Activity, Minimize2 } from 'lucide-react';
import { useRateLimit, LIMITS } from '@/hooks/useRateLimit';
import { useResearch } from '@/context/ResearchContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-backdrop">
      <div className="bg-surface border border-primary/10 rounded-xl shadow-2xl max-w-lg w-full animate-modal">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary/10 bg-primary text-on-primary rounded-t-xl">
          <h2 className="font-display text-xl uppercase tracking-wider flex items-center gap-2">
            <Search className="w-5 h-5" />
            AI Research Agent
          </h2>
          <button onClick={handleClose} className="text-on-primary/70 hover:text-on-primary text-2xl font-light">×</button>
        </div>

        {/* Body */}
        <div className="p-6">
          {status === 'idle' ? (
            <div className="space-y-5">
              <div>
                <label className="block font-label text-sm text-secondary mb-2 uppercase tracking-wide">
                  Topic to Research
                </label>
                <input
                  type="text"
                  placeholder="e.g., The Cynics of Ancient Greece"
                  className="w-full px-4 py-3 bg-background border border-primary/10 rounded-md focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none text-primary"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isRateLimited && handleStartResearch()}
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-label text-sm text-secondary mb-2 uppercase tracking-wide">
                  AI Model
                </label>
                <div className="flex bg-background border border-primary/10 rounded-md p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-2.5-flash')}
                    className={`flex-1 py-2 px-4 rounded text-xs font-sans font-medium transition-colors ${
                      selectedModel === 'gemini-2.5-flash'
                        ? 'bg-tertiary text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    Gemini 2.5 Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    className={`flex-1 py-2 px-4 rounded text-xs font-sans font-medium transition-colors ${
                      selectedModel === 'gemini-3.5-flash'
                        ? 'bg-tertiary text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface'
                    }`}
                  >
                    Gemini 3.5 Flash
                  </button>
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block font-label text-sm text-secondary mb-2 uppercase tracking-wide">
                  Destination
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-3 bg-background border border-primary/10 rounded-md text-primary flex items-center justify-between font-sans text-xs tracking-wide cursor-pointer hover:border-tertiary focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all duration-200"
                >
                  <span className="truncate">
                    {existingCourseId === "" 
                      ? "+ Create Brand New Course" 
                      : `Add to: ${courses.find(c => c.id === existingCourseId)?.title || ''}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-secondary transition-transform duration-200 shrink-0 ml-2 ${dropdownOpen ? 'rotate-180 text-tertiary' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-surface border border-primary/20 shadow-2xl rounded-md z-50 overflow-hidden font-sans text-xs py-1 animate-dropdown max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setExistingCourseId("");
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 transition-colors cursor-pointer flex items-center justify-between ${
                        existingCourseId === "" 
                          ? "bg-tertiary text-white font-medium" 
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
                        className={`w-full text-left px-4 py-2.5 transition-colors cursor-pointer flex items-center justify-between ${
                          existingCourseId === c.id 
                            ? "bg-tertiary text-white font-medium" 
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
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Daily or minute API limit reached. Please wait before generating again.</p>
                  </div>
                )}
                <button
                  onClick={handleStartResearch}
                  disabled={!topic.trim() || isRateLimited}
                  className="btn-tertiary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  START RESEARCH
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-6 text-center">
              {status === 'running' && (
                <>
                  <Loader2 className="w-12 h-12 text-tertiary animate-spin" />
                  <div className="w-full max-w-xs bg-primary/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-tertiary h-full transition-all duration-300 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <div>
                    <h3 className="font-label text-lg text-primary">{progress}%</h3>
                    <p className="text-secondary text-sm mt-2 animate-pulse">{progressMsg}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-background border border-primary/20 rounded-md text-xs font-label uppercase text-secondary hover:text-primary transition-colors hover:border-tertiary"
                  >
                    <Minimize2 className="w-4 h-4" />
                    Minimize to Background
                  </button>
                </>
              )}
              
              {status === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-label text-lg text-primary">Research Complete</h3>
                    <p className="text-secondary text-sm mt-1">Redirecting to course...</p>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-600">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-label text-lg text-primary">Research Failed</h3>
                    <p className="text-secondary text-sm mt-2 max-w-xs mx-auto break-words">{errorMsg}</p>
                  </div>
                  <button 
                    onClick={resetResearch}
                    className="mt-4 px-6 py-2 border border-primary/20 rounded-md text-sm font-label uppercase hover:bg-primary/5"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Rate Limit Display */}
        <div className="px-6 py-3 border-t border-primary/10 bg-surface rounded-b-xl flex items-center justify-between text-[10px] uppercase font-sans tracking-widest">
          <div className="flex items-center gap-1.5 text-secondary">
            <Activity className="w-3 h-3 text-tertiary" />
            <span>API Usage</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={currentRPM >= LIMITS.RPM ? 'text-red-500 font-bold' : 'text-secondary'}>
              {currentRPM}/{LIMITS.RPM} RPM
            </span>
            <span className={currentTPM >= LIMITS.TPM ? 'text-red-500 font-bold' : 'text-secondary'}>
              {(currentTPM / 1000).toFixed(1)}k/{(LIMITS.TPM / 1000).toFixed(0)}k TPM
            </span>
            <span className={currentRPD >= LIMITS.RPD ? 'text-red-500 font-bold' : 'text-primary font-bold'}>
              {currentRPD}/{LIMITS.RPD} Daily
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
