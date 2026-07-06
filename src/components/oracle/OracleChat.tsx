'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MessageSquare, Send, Plus, Trash2, Menu, Terminal, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import { useToast } from '@/context/ToastContext';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
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
        <strong key={`b-${keyIdx++}`} className="font-semibold text-primary">
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

function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-primary leading-relaxed">
      {lines.map((line, index) => {
        const cleanLine = line;

        // Headers
        if (cleanLine.startsWith('### ')) {
          return (
            <h4 key={index} className="font-serif font-bold text-sm mt-3 mb-1 text-primary">
              {cleanLine.slice(4)}
            </h4>
          );
        }
        if (cleanLine.startsWith('## ')) {
          return (
            <h3 key={index} className="font-serif font-bold text-base mt-4 mb-2 text-primary">
              {cleanLine.slice(3)}
            </h3>
          );
        }
        if (cleanLine.startsWith('# ')) {
          return (
            <h2 key={index} className="font-serif font-bold text-lg mt-4 mb-2 text-primary">
              {cleanLine.slice(2)}
            </h2>
          );
        }

        // Bullet points
        if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
          return (
            <ul key={index} className="list-disc pl-4 my-0.5">
              <li>{parseInline(cleanLine.slice(2))}</li>
            </ul>
          );
        }

        // Blank lines
        if (cleanLine.trim() === '') {
          return <div key={index} className="h-1.5" />;
        }

        // Standard line
        return <p key={index}>{parseInline(cleanLine)}</p>;
      })}
    </div>
  );
}

export default function OracleChat() {
  const { session, user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('oracle_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }, [user]);

  // Load messages for the active conversation
  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oracle_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      showToast('Failed to load chat history.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    void loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      void loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Select Conversation
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setSidebarOpen(false);
  };

  // Handle New Chat
  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const { error } = await supabase.from('oracle_conversations').delete().eq('id', id);
      if (error) throw error;

      showToast('Conversation deleted.', 'info');
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      void loadConversations();
    } catch {
      showToast('Failed to delete conversation.', 'error');
    }
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !session?.access_token) return;

    const userMessageContent = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic UI update
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessageContent,
          conversationId: activeConvId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // If it was a new conversation, set the new active ID
      if (!activeConvId && data.conversationId) {
        setActiveConvId(data.conversationId);
      }

      // Add assistant response to messages
      const assistantMsg: Message = {
        id: data.messageId || Math.random().toString(),
        role: 'assistant',
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        // Filter out the optimistic message and append both user + assistant to ensure proper IDs/dates
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          { ...tempUserMsg, id: tempUserMsg.id },
          assistantMsg,
        ];
      });

      // Refresh conversations list to update titles/ordering
      void loadConversations();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send message.', 'error');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border bg-surface flex h-full min-h-[500px] relative overflow-hidden">
      {/* Sidebar - Conversation List */}
      <aside
        className={`bg-surface border-r border-border w-64 flex flex-col absolute md:relative inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-label text-xs uppercase tracking-widest text-primary">Conversations</span>
          <button
            onClick={handleNewChat}
            className="p-1.5 border border-border hover:border-primary text-primary cursor-pointer transition-colors"
            title="New Chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center">
              <span className="font-serif italic text-xs text-secondary">No conversations yet</span>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`flex items-center justify-between p-2.5 text-xs transition-colors cursor-pointer group border ${
                    isActive
                      ? 'bg-neutral-bg border-primary text-primary'
                      : 'border-transparent text-secondary hover:text-primary hover:bg-neutral-bg/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-sans">{conv.title || 'Untitled Conversation'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-accent cursor-pointer transition-opacity"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-bg/10">
        {/* Chat Header */}
        <header className="border-b border-border p-3 flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1 border border-border text-primary cursor-pointer"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
            <span className="font-serif text-sm font-bold text-primary">
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title || 'Oracle Chat'
                : 'New Oracle Conversation'}
            </span>
          </div>

          {!activeConvId && messages.length > 0 && (
            <span className="font-mono text-[9px] text-accent uppercase tracking-wider">Unsaved draft</span>
          )}
        </header>

        {/* Message scroll container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
              <span className="p-3 border border-border rounded-none text-secondary mb-3 bg-surface">
                <Terminal className="h-5 w-5" />
              </span>
              <h4 className="font-serif text-sm font-bold text-primary mb-1">Consult the Oracle</h4>
              <p className="text-xs text-secondary leading-relaxed font-sans">
                Ask questions about your active projects, tasks, learnings, and journal patterns inside LifeOS. Oracle uses your latest Soul Blueprint snapshot for context.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isAssistant ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                >
                  <span className="font-mono text-[9px] text-secondary uppercase tracking-wider mb-1">
                    {isAssistant ? 'Oracle' : 'User'}
                  </span>
                  <div
                    className={`border p-3.5 leading-relaxed font-sans ${
                      isAssistant
                        ? 'bg-surface border-border text-primary'
                        : 'bg-primary text-on-primary border-primary'
                    }`}
                  >
                    <FormattedMessage text={msg.content} />
                  </div>
                </div>
              );
            })
          )}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex flex-col items-start max-w-[85%] mr-auto">
              <span className="font-mono text-[9px] text-secondary uppercase tracking-wider mb-1">Oracle</span>
              <div className="border border-border bg-surface p-3.5 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span className="font-serif italic text-xs text-secondary">Oracle is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="border-t border-border p-3 bg-surface flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask oracle about your context..."
            disabled={loading}
            className="flex-1 border border-border px-3.5 py-2.5 text-xs font-sans rounded-none focus:outline-none focus:border-primary disabled:opacity-60 bg-neutral-bg/20 text-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-accent text-on-accent border border-accent hover:opacity-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
        />
      )}
    </div>
  );
}
