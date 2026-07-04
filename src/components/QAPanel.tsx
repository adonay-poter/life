import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, MessageSquare, Send, Loader2, X, Sparkles } from 'lucide-react';

interface QAPanelProps {
  topic: string;
  moduleNotes: string;
}

export default function QAPanel({ topic, moduleNotes }: QAPanelProps) {
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
      const res = await fetch('/api/research/qa', {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          rawResearch: `Topic: ${topic}\n\nContext:\n${moduleNotes}`
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
        className="fixed bottom-20 right-6 md:bottom-6 md:right-28 bg-accent text-on-accent border border-accent/20 p-3.5 shadow-lg z-50 cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-90 hover:opacity-90 rounded-none btn-press hover:shadow-xl"
        aria-label="Ask Academy AI"
        title="Ask Academy AI"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 top-20 md:inset-auto md:bottom-6 md:right-28 md:w-96 md:h-[500px] bg-surface border border-border shadow-none rounded-none overflow-hidden z-[60] flex flex-col animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-border bg-primary text-on-primary flex items-center justify-between">
        <div className="flex items-center gap-2 font-label uppercase tracking-[0.15em] font-bold text-xs">
          <MessageSquare className="w-4 h-4 text-accent" />
          <span>Academy AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-on-primary/70 hover:text-on-primary cursor-pointer btn-press">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-background/50 font-sans" ref={scrollRef}>
        {conversation.length === 0 ? (
          <div className="text-center text-secondary text-xs mt-10">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-accent animate-pulse" />
            <p className="font-serif italic">Ask a question about this module's notes!</p>
          </div>
        ) : (
          conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-none p-3 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-bg border border-border text-primary' 
                    : 'bg-surface border border-border text-primary shadow-none font-medium'
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
            <div className="bg-surface border border-border text-primary rounded-none p-3 shadow-none">
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
          <input
            type="text"
            placeholder="Ask anything..."
            className="flex-grow px-3 py-2 bg-neutral-bg border border-border rounded-none focus:outline-none focus:border-primary text-xs text-primary font-sans"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="p-2 bg-primary border border-primary hover:bg-neutral-bg text-on-primary hover:text-primary transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 btn-press"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
