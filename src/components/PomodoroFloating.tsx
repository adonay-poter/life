'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Play, Pause, RotateCcw, Timer, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export default function PomodoroFloating() {
  const { tasks, updateTaskPomodoro } = useDashboard();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(1500); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const storedTime = localStorage.getItem('pomodoro_timeRemaining');
    const storedRunning = localStorage.getItem('pomodoro_isRunning');
    const storedBreak = localStorage.getItem('pomodoro_isBreak');
    const storedTaskId = localStorage.getItem('pomodoro_activeTaskId');

    if (storedTime !== null) setTimeRemaining(parseInt(storedTime, 10));
    if (storedRunning !== null) setIsRunning(storedRunning === 'true');
    if (storedBreak !== null) setIsBreak(storedBreak === 'true');
    if (storedTaskId !== null) setActiveTaskId(storedTaskId);
    setIsLoaded(true);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('pomodoro_timeRemaining', timeRemaining.toString());
    localStorage.setItem('pomodoro_isRunning', isRunning.toString());
    localStorage.setItem('pomodoro_isBreak', isBreak.toString());
    localStorage.setItem('pomodoro_activeTaskId', activeTaskId);
  }, [timeRemaining, isRunning, isBreak, activeTaskId, isLoaded]);

  // Sync timer to browser document title
  useEffect(() => {
    const originalTitle = 'Hulu - ሁሉ - Life Dashboard';
    if (isRunning) {
      const typeLabel = isBreak ? 'Break' : 'Focus';
      document.title = `${typeLabel} (${formatTime(timeRemaining)}) | Hulu`;
    } else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [isRunning, isBreak, timeRemaining]);

  // Sync active task to first pending task if none selected or if selected task is completed/missing
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    const isCurrentActivePending = pendingTasks.some((t) => t.id === activeTaskId);
    
    if (pendingTasks.length > 0 && (!activeTaskId || !isCurrentActivePending)) {
      requestAnimationFrame(() => {
        if (active) setActiveTaskId(pendingTasks[0].id);
      });
    } else if (pendingTasks.length === 0 && activeTaskId) {
      requestAnimationFrame(() => {
        if (active) setActiveTaskId('');
      });
    }
    
    return () => {
      active = false;
    };
  }, [tasks, activeTaskId, isLoaded]);

  // Web Audio synth beep
  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5 note
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (err) {
      console.warn('Audio play failed:', err);
    }
  };

  // Timer Tick Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playAlertSound();
            
            // Session Complete Logic
            if (!isBreak) {
              // Work session finished
              if (activeTaskId) {
                const task = tasks.find((t) => t.id === activeTaskId);
                if (task) {
                  updateTaskPomodoro(activeTaskId, (task.pomodoro_sessions || 0) + 1);
                }
              }
              // Switch to break
              setIsBreak(true);
              return 300; // 5 min break
            } else {
              // Break session finished
              setIsBreak(false);
              return 1500; // 25 min work
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isBreak, activeTaskId, tasks, updateTaskPomodoro]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeRemaining(1500);
  };

  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveTaskId(e.target.value);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const pendingTasks = tasks.filter((t) => t.status !== 'done');

  // Math for SVG progress circle
  const totalDuration = isBreak ? 300 : 1500;
  const progressPct = ((totalDuration - timeRemaining) / totalDuration) * 100;

  return (
    <div className="hidden md:block fixed bottom-16 md:bottom-6 right-6 z-50">
      {/* COLLAPSED FLOATING BUBBLE */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center space-x-2 bg-white border border-[#6C7278] shadow-lg px-4 py-3 rounded-none transition-all duration-300 hover:border-[#B8422E] ${
            isRunning ? 'ring-1 ring-[#B8422E]/55' : ''
          }`}
        >
          <Timer className={`h-4.5 w-4.5 ${isRunning ? 'text-[#B8422E] animate-pulse' : 'text-[#1A1C1E]'}`} />
          <span className="font-label text-xs font-bold tracking-widest text-[#1A1C1E]">
            {formatTime(timeRemaining)}
          </span>
          {isBreak && (
            <span className="font-label text-xs bg-[#B8422E] text-white px-1 uppercase tracking-wide">
              Break
            </span>
          )}
          <ChevronUp className="h-3 w-3 text-[#6C7278]" />
        </button>
      ) : (
        /* EXPANDED INTERACTIVE PANEL */
        <div className="bg-white border border-[#6C7278] shadow-2xl p-5 w-72 rounded-none space-y-4">
          <div className="flex justify-between items-center border-b border-[#6C7278]/30 pb-2">
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-[#B8422E]" />
              <span className="font-label text-xs font-bold tracking-[0.1em] uppercase text-[#6C7278]">
                {isBreak ? 'Break Session' : 'Focus Session'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#6C7278] hover:text-[#1A1C1E] transition-all"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* TIMER GRAPHICS */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="40"
                className="stroke-current text-[#F7F5F2]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="40"
                className="stroke-current text-[#B8422E]"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * progressPct) / 100}
                strokeLinecap="square"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold tracking-tight text-[#1A1C1E]">
                {formatTime(timeRemaining)}
              </span>
              <span className="font-label text-xs text-[#6C7278] uppercase tracking-[0.1em]">
                {isBreak ? 'resting' : 'focusing'}
              </span>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={toggleTimer}
              className="flex items-center justify-center h-10 w-10 border border-[#6C7278] text-[#1A1C1E] hover:bg-[#F7F5F2] transition-all rounded-sm"
              title={isRunning ? 'Pause' : 'Start'}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={resetTimer}
              className="flex items-center justify-center h-10 w-10 border border-[#6C7278] text-[#1A1C1E] hover:bg-[#F7F5F2] transition-all rounded-sm"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* LINKED TASK DROPDOWN */}
          <div className="space-y-1.5 pt-2 border-t border-[#6C7278]/30">
            <label className="block font-label text-xs text-[#6C7278] uppercase tracking-[0.1em]">
              Link Focus Task
            </label>
            {pendingTasks.length > 0 ? (
              <select
                value={activeTaskId}
                onChange={handleTaskChange}
                className="w-full bg-[#F7F5F2] border border-[#6C7278] px-2 py-1.5 text-xs text-[#1A1C1E] focus:outline-none focus:border-[#B8422E] font-sans"
              >
                {pendingTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-sans text-xs text-[#6C7278] italic">No active tasks available</p>
            )}

            {activeTask && (
              <div className="flex items-center space-x-1.5 mt-2 bg-[#F7F5F2] px-2 py-1 text-xs text-[#6C7278] border border-[#6C7278]/20 font-sans">
                <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />
                <span className="truncate">Sessions logged: {activeTask.pomodoro_sessions || 0}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
