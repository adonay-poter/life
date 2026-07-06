'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, Loader2, MessageSquare, PanelLeft, Plus, Send, Sparkles } from 'lucide-react';
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

function parseInline(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const italicMatch = remaining.match(/\*(.*?)\*/);

    if (boldMatch && (!italicMatch || boldMatch.index! < italicMatch.index!)) {
      const idx = boldMatch.index!;
      if (idx > 0) parts.push(remaining.substring(0, idx));
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(idx + boldMatch[0].length);
    } else if (italicMatch) {
      const idx = italicMatch.index!;
      if (idx > 0) parts.push(remaining.substring(0, idx));
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.substring(idx + italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
}

function FormattedMessage({ text, invert = false }: { text: string; invert?: boolean }) {
  if (!text) return null;

  return (
    <div className={`space-y-2 text-sm leading-7 ${invert ? 'text-on-primary' : 'text-primary'}`}>
      {text.split('\n').map((line, index) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={index} className={`font-display text-base font-bold ${invert ? 'text-on-primary' : 'text-primary'}`}>
              {line.slice(4)}
            </h4>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className={`font-display text-lg font-bold ${invert ? 'text-on-primary' : 'text-primary'}`}>
              {line.slice(3)}
            </h3>
          );
        }

        if (line.startsWith('# ')) {
          return (
            <h2 key={index} className={`font-display text-xl font-bold ${invert ? 'text-on-primary' : 'text-primary'}`}>
              {line.slice(2)}
            </h2>
          );
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <ul key={index} className="list-disc pl-5">
              <li>{parseInline(line.slice(2))}</li>
            </ul>
          );
        }

        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }

        return <p key={index}>{parseInline(line)}</p>;
      })}
    </div>
  );
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

  return (
    <section className="relative flex min-h-[780px] flex-col overflow-hidden border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,245,242,0.82))]">
      <header className="border-b border-border bg-surface/90 px-4 py-4 backdrop-blur sm:px-6 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              className="mt-1 flex h-10 w-10 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary"
              aria-label="Toggle conversations"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-bold text-primary">{threadTitle}</h3>
                {!hasThread && (
                  <span className="border border-border bg-neutral-bg px-2 py-1 font-label text-[10px] uppercase tracking-[0.24em] text-secondary">
                    Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="hidden h-10 items-center gap-2 border border-border bg-surface px-4 text-xs font-label uppercase tracking-[0.24em] text-primary transition-colors hover:border-primary sm:flex"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </header>

      <div ref={messageScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 border border-border bg-surface px-5 py-4 text-secondary shadow-[0_12px_30px_rgba(26,28,30,0.05)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-serif italic text-sm">Loading…</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex h-full w-full max-w-4xl items-end">
            <div className="h-[42vh] w-full border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,245,242,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-8">
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
                          ? 'border-border bg-surface'
                          : 'border-primary bg-primary text-on-primary'
                      }`}
                    >
                      <FormattedMessage text={message.content} invert={!isAssistant} />
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

      <form onSubmit={handleSend} className="border-t border-border bg-surface/95 p-4 backdrop-blur sm:p-5 shrink-0">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div className="border border-border bg-surface p-3 shadow-[0_12px_30px_rgba(26,28,30,0.06)]">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask Oracle"
                disabled={sending || loadingMessages}
                rows={1}
                className="max-h-[240px] min-h-[44px] w-full resize-none bg-transparent text-base leading-7 text-primary outline-none placeholder:text-secondary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loadingMessages}
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-accent bg-accent text-on-accent transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex h-10 items-center gap-2 border border-border bg-surface px-3 text-[10px] font-label uppercase tracking-[0.24em] text-primary transition-colors hover:border-primary sm:hidden"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
              <p className="text-xs leading-6 text-secondary">Enter to send. Shift+Enter for a new line.</p>
            </div>
            <button
              type="button"
              onClick={() => messageScrollRef.current?.scrollTo({ top: messageScrollRef.current.scrollHeight, behavior: 'smooth' })}
              className="flex h-10 w-10 items-center justify-center border border-border bg-surface text-primary transition-colors hover:border-primary"
              aria-label="Jump to latest"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

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
