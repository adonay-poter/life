'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAcademy } from './AcademyContext';
import { useToast } from './ToastContext';
import { useRateLimit } from '@/hooks/useRateLimit';

interface ResearchContextProps {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
  progressMsg: string;
  errorMsg: string;
  startResearch: (topic: string, existingCourseId: string, selectedModel: string) => Promise<void>;
  resetResearch: () => void;
}

const ResearchContext = createContext<ResearchContextProps | undefined>(undefined);

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};

export const ResearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  const {
    courses,
    courseModules,
    addCourse,
    addModule,
    addLesson,
    updateModuleNotes
  } = useAcademy();

  const { recordUsage } = useRateLimit();

  const resetResearch = () => {
    setStatus('idle');
    setProgress(0);
    setProgressMsg('');
    setErrorMsg('');
  };

  const startResearch = async (topic: string, existingCourseId: string, selectedModel: string) => {
    if (!topic.trim()) return;
    setStatus('running');
    setProgress(5);
    setProgressMsg('Finding authoritative sources...');
    setErrorMsg('');

    try {
      // 0. Build Existing Context if applicable
      let existingContext = '';
      if (existingCourseId) {
        const course = courses.find((c) => c.id === existingCourseId);
        const modules = courseModules.filter((m) => m.course_id === existingCourseId).sort((a, b) => a.order_index - b.order_index);
        
        if (course) {
          existingContext += `Course Title: ${course.title}\n`;
          if (course.description) existingContext += `Course Description: ${course.description}\n`;
          
          if (modules.length > 0) {
            existingContext += `\nExisting Modules:\n`;
            modules.forEach(m => {
              existingContext += `- ${m.title}\n`;
              if (m.notes) existingContext += `  Notes Summary: ${m.notes.substring(0, 500)}...\n`;
            });
          }
        }
      }

      // 1. Search
      const searchRes = await fetch('/api/research/search', {
        method: 'POST',
        body: JSON.stringify({ topic, model: selectedModel }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!searchRes.ok) throw new Error('Search failed');
      const searchData = await searchRes.json();
      recordUsage(searchData.tokens || 0);
      const { urls } = searchData;
      
      if (!urls || urls.length === 0) {
        throw new Error('No sources found for this topic.');
      }

      setProgress(20);
      setProgressMsg(`Found ${urls.length} sources. Extracting content...`);

      // 2. Extract content from URLs
      let researchContent = '';
      for (let i = 0; i < urls.length; i++) {
        setProgress(20 + Math.floor((30 * (i + 1)) / urls.length));
        setProgressMsg(`Extracting source ${i + 1} of ${urls.length}...`);
        
        try {
          const extractRes = await fetch('/api/research/extract', {
            method: 'POST',
            body: JSON.stringify({ url: urls[i] }),
            headers: { 'Content-Type': 'application/json' }
          });
          if (extractRes.ok) {
            const { content } = await extractRes.json();
            researchContent += `\n\n--- Source: ${urls[i]} ---\n\n${content}`;
          }
        } catch (e) {
          console.warn('Failed to extract:', urls[i]);
        }
      }

      if (researchContent.length < 100) {
        throw new Error('Could not extract enough content from sources.');
      }

      setProgress(50);
      setProgressMsg('Synthesizing research and creating course outline...');

      // 3. Create Outline
      const outlineRes = await fetch('/api/research/outline', {
        method: 'POST',
        body: JSON.stringify({ topic, researchContent, model: selectedModel, existingContext }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!outlineRes.ok) {
        let errMsg = 'Failed to generate outline';
        try {
          const errData = await outlineRes.json();
          if (errData.error) errMsg += `: ${errData.error}`;
        } catch(e) {}
        throw new Error(errMsg);
      }
      const outlineData = await outlineRes.json();
      recordUsage(outlineData.tokens || 0);
      const { outline } = outlineData;

      setProgress(60);
      setProgressMsg('Creating academy structures...');

      // 4. Create Course (or use existing)
      let targetCourseId = existingCourseId;
      let startModuleIndex = 1;
      
      if (!targetCourseId) {
        targetCourseId = await addCourse(
          outline.title || topic, 
          outline.description || `AI Research on ${topic}`,
          outline.category || 'Research'
        );
      } else {
        const existingModulesCount = courseModules.filter((m) => m.course_id === targetCourseId).length;
        startModuleIndex = existingModulesCount + 1;
      }

      // 5. Generate Modules and Notes sequentially
      const modulesToCreate = outline.modules || [];
      for (let i = 0; i < modulesToCreate.length; i++) {
        const mod = modulesToCreate[i];
        setProgress(60 + Math.floor((40 * i) / modulesToCreate.length));
        setProgressMsg(`Writing notes for module: ${mod.title}...`);

        const modId = await addModule(targetCourseId, mod.title, startModuleIndex + i);

        // Generate Notes
        const notesRes = await fetch('/api/research/generate-module', {
          method: 'POST',
          body: JSON.stringify({ topic, module: mod, researchContent, model: selectedModel, existingContext }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (notesRes.ok) {
          const notesData = await notesRes.json();
          recordUsage(notesData.tokens || 0);
          await updateModuleNotes(modId, notesData.markdown);
        }

        // Create a dummy lesson for each source url just so there are lessons
        for (let j = 0; j < Math.min(2, urls.length); j++) {
           await addLesson(modId, `Source Material ${j+1}`, urls[j]);
        }
      }

      setProgress(100);
      setProgressMsg('Research complete!');
      setStatus('success');
      
      showToast('AI Research completed successfully!', 'success');

      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during research.');
    }
  };

  return (
    <ResearchContext.Provider
      value={{
        status,
        progress,
        progressMsg,
        errorMsg,
        startResearch,
        resetResearch
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
};
