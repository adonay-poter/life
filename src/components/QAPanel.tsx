import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, X, Sparkles } from 'lucide-react';

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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-tertiary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40 flex items-center gap-2 group"
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden group-hover:inline-block font-label text-sm uppercase tracking-wide pr-2">
          Ask AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-surface border border-primary/10 shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col h-[500px] animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-primary/10 bg-primary text-on-primary flex items-center justify-between">
        <div className="flex items-center gap-2 font-display uppercase tracking-wide">
          <MessageSquare className="w-4 h-4 text-tertiary" />
          <span>Academy AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-on-primary/70 hover:text-on-primary">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50" ref={scrollRef}>
        {conversation.length === 0 ? (
          <div className="text-center text-secondary text-sm mt-10">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Ask a question about this module's notes!</p>
          </div>
        ) : (
          conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-on-primary rounded-tr-none' 
                    : 'bg-surface border border-primary/10 text-primary rounded-tl-none shadow-sm'
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
            <div className="bg-surface border border-primary/10 text-primary rounded-lg rounded-tl-none p-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-tertiary animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-primary/10 bg-surface">
        <form 
          onSubmit={(e) => { e.preventDefault(); askQuestion(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 bg-background border border-primary/10 rounded-md focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none text-sm text-primary"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="p-2 bg-tertiary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
