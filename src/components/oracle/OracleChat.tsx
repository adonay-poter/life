'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, Loader2, MessageSquare, PanelLeft, Plus, Send, Sparkles } from 'lucide-react';
import MarkdownMessage from '@/components/oracle/MarkdownMessage';
import OracleConversationRail from '@/components/oracle/OracleConversationRail';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/utils/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function OracleChat() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryConversationId = searchParams?.get('conversation') ?? null;
  const [activeConvId, setActiveConvId] = useState<string | null>(queryConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [threadTitle, setThreadTitle] = useState('New Oracle Conversation');
  const [railOpen, setRailOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasThread = useMemo(() => Boolean(activeConvId), [activeConvId]);
  const hasMessages = messages.length > 0;
  const showStickyComposer = hasMessages || sending || loadingMessages;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('oracle_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const rows = data || [];
        setMessages(rows);

        const firstUserMessage = rows.find((message) => message.role === 'user');
        setThreadTitle(firstUserMessage?.content.slice(0, 72) || 'Oracle Conversation');
      } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Failed to load chat history.', 'error');
      } finally {
        setLoadingMessages(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    setActiveConvId(queryConversationId);
    if (!queryConversationId) {
      setMessages([]);
      setThreadTitle('New Oracle Conversation');
    }
  }, [queryConversationId]);

  useEffect(() => {
    if (!activeConvId) return;
    void loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`;
    node.style.overflowY = node.scrollHeight > 240 ? 'auto' : 'hidden';
  }, [input]);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setThreadTitle('New Oracle Conversation');
    setRailOpen(false);
    router.push('/oracle');
    inputRef.current?.focus();
  }, [router]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConvId(conversationId);
      setRailOpen(false);
      router.push(`/oracle?conversation=${conversationId}`);
    },
    [router]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || loadingMessages || !session?.access_token) return;

    const messageContent = input.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticUserMessage: Message = {
      id: tempId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setInput('');
    setSending(true);
    setMessages((current) => [...current, optimisticUserMessage]);
    if (!hasThread) {
      setThreadTitle(messageContent.slice(0, 72));
    }

    try {
      const response = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: messageContent,
          conversationId: activeConvId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      if (!activeConvId && data.conversationId) {
        setActiveConvId(data.conversationId);
        router.replace(`/oracle?conversation=${data.conversationId}`);
      }

      const assistantMessage: Message = {
        id: data.messageId || `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [
        ...current.filter((message) => message.id !== tempId),
        optimisticUserMessage,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to send message.', 'error');
      setMessages((current) => current.filter((message) => message.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [activeConvId, hasThread, input, loadingMessages, router, sending, session, showToast]);

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await sendMessage();
    },
    [sendMessage]
  );

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const activeContexts = useMemo(() => {
    const query = input.toLowerCase();
    const active = {
      core: true,
      projects: false,
      learning: false,
      journal: false,
      review: false,
    };

    const projectKeywords = ['project', 'task', 'todo', 'work', 'board', 'action', 'hulu', 'icog', 'outreach'];
    const learningKeywords = ['learn', 'academy', 'course', 'study', 'lesson', 'knowledge', 'book', 'read'];
    const journalKeywords = ['journal', 'reflect', 'mood', 'entry', 'daily', 'note', 'thought'];
    const reviewKeywords = ['review', 'weekly', 'habit', 'loop', 'signal', 'evening', 'midday', 'check-in'];

    if (projectKeywords.some((kw) => query.includes(kw))) active.projects = true;
    if (learningKeywords.some((kw) => query.includes(kw))) active.learning = true;
    if (journalKeywords.some((kw) => query.includes(kw))) active.journal = true;
    if (reviewKeywords.some((kw) => query.includes(kw))) active.review = true;

    return active;
  }, [input]);

  const composer = (
    <div className="mx-auto w-full max-w-4xl">
      <div className="border border-border bg-surface shadow-[0_12px_32px_rgba(26,28,30,0.05)] flex flex-col focus-within:border-primary transition-colors">
        <div className="flex items-start gap-3 p-3.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask Oracle..."
            disabled={sending || loadingMessages}
            rows={1}
            className="max-h-[200px] min-h-[50px] w-full resize-none bg-transparent text-sm leading-7 text-primary outline-none placeholder:text-secondary/70 disabled:opacity-60"
          />
        </div>

        {/* Bottom Actions & Dynamic Context Indicators */}
        <div className="flex items-center justify-between border-t border-border/40 px-3.5 py-2 bg-neutral-bg/15 shrink-0 flex-wrap gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-mono text-[9px] text-secondary/60 uppercase tracking-wider">Context:</span>
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-accent font-bold">
              ● Core
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${activeContexts.projects ? 'text-accent font-bold' : 'text-secondary/50'}`}>
              {activeContexts.projects ? '●' : '○'} Projects
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${activeContexts.learning ? 'text-accent font-bold' : 'text-secondary/50'}`}>
              {activeContexts.learning ? '●' : '○'} Learning
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${activeContexts.journal ? 'text-accent font-bold' : 'text-secondary/50'}`}>
              {activeContexts.journal ? '●' : '○'} Journal
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${activeContexts.review ? 'text-accent font-bold' : 'text-secondary/50'}`}>
              {activeContexts.review ? '●' : '○'} Review
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[9px] text-secondary/50 uppercase tracking-wider">↵ to send</span>
            <button
              type="submit"
              disabled={!input.trim() || sending || loadingMessages}
              className="flex h-8 w-8 items-center justify-center border border-accent bg-accent text-on-accent transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              aria-label="Send"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden border border-border bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(247,245,242,0.88)_52%,rgba(240,236,229,0.92)_100%)]">
      <header className="border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-6 shrink-0">
        <div className="flex items-center justify-between gap-4 h-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary cursor-pointer"
              aria-label="Toggle conversations"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-serif text-base font-bold text-primary truncate max-w-[180px] sm:max-w-[360px] tracking-wide leading-none">
                {threadTitle}
              </h3>
              {!hasThread && (
                <span className="border border-border bg-neutral-bg px-1.5 py-0.5 font-label text-[9px] uppercase tracking-[0.25em] text-secondary shrink-0 leading-none">
                  Draft
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary sm:w-auto sm:px-4 sm:gap-2 cursor-pointer"
            title="New Conversation"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-[10px] font-label uppercase tracking-widest leading-none">New</span>
          </button>
        </div>
      </header>

      <div ref={messageScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 border border-border bg-surface px-5 py-4 text-secondary shadow-[0_12px_30px_rgba(26,28,30,0.05)]">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="font-serif italic text-sm">Loading…</span>
            </div>
          </div>
        ) : !hasMessages ? (
          <div className="mx-auto flex min-h-[62vh] w-full max-w-4xl items-center justify-center">
            <div className="w-full max-w-3xl">
              <form onSubmit={handleSend}>
                {composer}
              </form>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-40">
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';

              return (
                <article
                  key={message.id}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="max-w-[92%] sm:max-w-[80%]">
                    <div className={`mb-2 flex items-center gap-2 ${isAssistant ? '' : 'justify-end'}`}>
                      {isAssistant ? (
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-secondary" />
                      )}
                      <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">
                        {isAssistant ? 'Oracle' : 'You'}
                      </span>
                      <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary/80">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={`border p-4 shadow-[0_10px_24px_rgba(26,28,30,0.04)] sm:p-5 ${
                        isAssistant
                          ? 'border-border bg-surface text-primary'
                          : 'border-primary bg-primary text-on-primary font-medium'
                      }`}
                    >
                      <MarkdownMessage text={message.content} invert={!isAssistant} />
                    </div>
                  </div>
                </article>
              );
            })}

            {sending && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="max-w-[92%] sm:max-w-[80%]">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="font-label text-[10px] uppercase tracking-[0.24em] text-secondary">Oracle</span>
                  </div>
                  <div className="flex items-center gap-3 border border-border bg-surface p-4 shadow-[0_10px_24px_rgba(26,28,30,0.04)]">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span className="font-serif text-sm italic text-secondary">Oracle is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showStickyComposer && (
        <div className="sticky bottom-0 z-10 mt-auto border-t border-border bg-[linear-gradient(180deg,rgba(247,245,242,0.1),rgba(247,245,242,0.92)_18%,rgba(247,245,242,0.98)_100%)] px-4 pb-4 pt-6 backdrop-blur-md sm:px-6 sm:pb-5 sm:pt-7">
          <form onSubmit={handleSend}>
            {composer}
          </form>

          <div className="mx-auto mt-2 flex max-w-4xl justify-end">
            <button
              type="button"
              onClick={() => messageScrollRef.current?.scrollTo({ top: messageScrollRef.current.scrollHeight, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary cursor-pointer"
              title="Jump to latest"
              aria-label="Jump to latest"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {railOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]" onClick={() => setRailOpen(false)} />
          <div className="absolute inset-y-0 left-0 z-30 w-full max-w-[360px] shadow-[20px_0_50px_rgba(26,28,30,0.12)]">
            <OracleConversationRail
              activeConversationId={activeConvId}
              onNewChat={handleNewChat}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        </>
      )}
    </section>
  );
}
