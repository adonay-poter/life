import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, MessageSquare, Send, Loader2, X, Sparkles } from 'lucide-react';
import { useSoulBlueprint } from '@/context/SoulBlueprintContext';
import { buildSoulBlueprintChatContext } from '@/utils/soulBlueprint';
import EmptyState from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Inputs';

interface QAPanelProps {
  courseTitle: string;
  moduleTitle: string;
  topic: string;
  moduleNotes: string;
}

export default function QAPanel({ courseTitle, moduleTitle, topic, moduleNotes }: QAPanelProps) {
  const { snapshot } = useSoulBlueprint();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const askQuestion = async () => {
    if (!question.trim()) return;
    
    const q = question;
    setQuestion('');
    setConversation(prev => [...prev, { role: 'user', text: q }]);
    setIsLoading(true);

    try {
      const blueprintContext = buildSoulBlueprintChatContext(snapshot, q);
      const res = await fetch('/api/research/qa', {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          rawResearch: [
            `Course: ${courseTitle}`,
            `Module: ${moduleTitle}`,
            `Topic: ${topic}`,
            '',
            'Module Notes:',
            moduleNotes
          ].join('\n'),
          courseTitle,
          moduleTitle,
          soulBlueprint: blueprintContext
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Failed to fetch answer');
      const { answer } = await res.json();

      setConversation(prev => [...prev, { role: 'agent', text: answer }]);
    } catch (err: any) {
      setConversation(prev => [...prev, { role: 'agent', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center justify-center rounded-[20px] border border-accent/20 bg-accent p-3.5 text-on-accent shadow-[0_16px_32px_rgba(184,66,46,0.28)] transition-all duration-300 ease-out hover:opacity-95 md:bottom-28 md:right-6 btn-press"
        aria-label="Ask Academy AI"
        title="Ask Academy AI"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-20 z-[60] flex flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_24px_60px_rgba(26,28,30,0.18)] transition-all duration-300 ease-out motion-safe:animate-slide-up md:inset-auto md:bottom-28 md:right-6 md:h-[500px] md:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-[linear-gradient(135deg,rgba(184,66,46,0.12),rgba(26,28,30,0.04)_55%,rgba(26,28,30,0.01))] p-4">
        <div className="flex items-center gap-2 font-label text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <MessageSquare className="w-4 h-4 text-accent" />
          <span>Academy AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="btn-press rounded-xl p-1 text-secondary hover:bg-surface hover:text-primary cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-background/50 font-sans" ref={scrollRef}>
        {conversation.length === 0 ? (
          <EmptyState
            title="Start with a study question."
            description="Ask about this module's notes and Oracle will answer in context."
          />
        ) : (
          conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-[20px] p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-bg border border-border text-primary' 
                    : 'app-panel-subtle text-primary font-medium'
                }`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-[20px] border border-border bg-surface p-3 text-primary">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface">
        <form 
          onSubmit={(e) => { e.preventDefault(); askQuestion(); }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Ask anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-grow bg-neutral-bg text-sm"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary bg-primary text-on-primary transition-colors hover:bg-neutral-bg hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
