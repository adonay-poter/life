'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/utils/supabaseClient';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface OracleConversationRailProps {
  activeConversationId?: string | null;
  onNewChat?: () => void;
  onSelectConversation?: (conversationId: string) => void;
}

function formatConversationTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function OracleConversationRail({
  activeConversationId = null,
  onNewChat,
  onSelectConversation,
}: OracleConversationRailProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oracle_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showToast('Failed to load conversations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleDeleteConversation = useCallback(
    async (event: React.MouseEvent, conversationId: string) => {
      event.preventDefault();
      event.stopPropagation();
      if (!confirm('Delete this Oracle conversation?')) return;

      try {
        const { error } = await supabase
          .from('oracle_conversations')
          .delete()
          .eq('id', conversationId);

        if (error) throw error;

        setConversations((current) =>
          current.filter((conversation) => conversation.id !== conversationId)
        );
        showToast('Conversation deleted.', 'info');
      } catch (error) {
        console.error(error);
        showToast('Failed to delete conversation.', 'error');
      }
    },
    [showToast]
  );

  const filteredConversations = conversations.filter((conversation) => {
    if (!query.trim()) return true;
    return (conversation.title || 'Untitled conversation')
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  });

  return (
    <section className="flex h-full min-h-[680px] flex-col overflow-hidden border border-border bg-surface">
      <div className="border-b border-border bg-[linear-gradient(180deg,rgba(247,245,242,0.92),rgba(247,245,242,0.72))] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-primary">Threads</h3>
          </div>
          {onNewChat ? (
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-10 w-10 items-center justify-center border border-border text-primary transition-colors hover:border-primary"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/oracle"
              className="flex h-10 items-center gap-2 border border-border px-3 text-xs font-label uppercase tracking-[0.24em] text-primary transition-colors hover:border-primary"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Link>
          )}
        </div>

        <div className="mt-4 border border-border bg-surface px-3 py-2">
          <div className="flex items-center gap-2 text-secondary">
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search threads"
              className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center justify-between font-label text-[11px] uppercase tracking-[0.24em] text-secondary">
          <span>{filteredConversations.length} shown</span>
          <span>{conversations.length} total</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="border border-dashed border-border bg-neutral-bg/40 p-5 text-center">
            <span className="font-serif text-sm italic text-secondary">No saved conversations yet.</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="border border-dashed border-border bg-neutral-bg/40 p-5 text-center">
            <span className="font-serif text-sm italic text-secondary">No matches.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const href = `/oracle?conversation=${conversation.id}`;

              return (
                <Link
                  key={conversation.id}
                  href={href}
                  onClick={(event) => {
                    if (onSelectConversation) {
                      event.preventDefault();
                      onSelectConversation(conversation.id);
                    }
                  }}
                  className={`group flex items-start justify-between gap-3 border p-3 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-neutral-bg text-primary shadow-[inset_3px_0_0_0_var(--primary)]'
                      : 'border-border bg-surface text-primary hover:border-primary hover:bg-neutral-bg/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-secondary">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-label text-[10px] uppercase tracking-[0.24em]">
                        {formatConversationTime(conversation.updated_at)}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6">
                      {conversation.title || 'Untitled conversation'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => void handleDeleteConversation(event, conversation.id)}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-secondary opacity-100 transition-colors hover:border-border hover:text-accent lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
