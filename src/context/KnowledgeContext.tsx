'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';

export interface KnowledgeItem {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  type?: string;
  source_url?: string;
  topic?: string;
  summary?: string;
  created_from_inbox_item_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ObjectLink {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship_type?: string;
  created_at: string;
}

export interface DailyDigest {
  id: string;
  user_id: string;
  date: string;
  summary?: string;
  captured_count: number;
  processed_count: number;
  knowledge_count: number;
  tasks_created_count: number;
  flashcards_created_count: number;
  open_questions: string[];
  important_insights: string[];
  journal_entries_count: number;
  projects_touched_count: number;
  tomorrow_inherits?: string;
  suggested_actions: any[];
  created_at: string;
  updated_at: string;
}

interface KnowledgeContextProps {
  knowledgeItems: KnowledgeItem[];
  objectLinks: ObjectLink[];
  dailyDigests: DailyDigest[];
  loading: boolean;
  addKnowledgeItem: (
    title: string,
    content?: string,
    type?: string,
    sourceUrl?: string,
    topic?: string,
    summary?: string,
    createdFromInboxItemId?: string
  ) => Promise<string>;
  updateKnowledgeItem: (id: string, updates: Partial<Omit<KnowledgeItem, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  deleteKnowledgeItem: (id: string) => Promise<void>;
  addObjectLink: (
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType?: string
  ) => Promise<void>;
  deleteObjectLink: (id: string) => Promise<void>;
  getDailyDigestForDate: (date: string) => Promise<DailyDigest | null>;
  upsertDailyDigest: (date: string, updates: Partial<Omit<DailyDigest, 'id' | 'user_id' | 'date' | 'created_at'>>) => Promise<void>;
}

const KnowledgeContext = createContext<KnowledgeContextProps | undefined>(undefined);

export const useKnowledge = () => {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
};

export const KnowledgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [objectLinks, setObjectLinks] = useState<ObjectLink[]>([]);
  const [dailyDigests, setDailyDigests] = useState<DailyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setKnowledgeItems([]);
        setObjectLinks([]);
        setDailyDigests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Load knowledge items
        const { data: kData, error: kError } = await supabase.from('knowledge_items').select('*');
        if (!kError && kData) {
          setKnowledgeItems(kData);
          localStorage.setItem('heritage_knowledge_items', JSON.stringify(kData));
        } else {
          const localK = localStorage.getItem('heritage_knowledge_items');
          if (localK) setKnowledgeItems(JSON.parse(localK));
        }

        // Load object links
        const { data: lData, error: lError } = await supabase.from('object_links').select('*');
        if (!lError && lData) {
          setObjectLinks(lData);
          localStorage.setItem('heritage_object_links', JSON.stringify(lData));
        } else {
          const localL = localStorage.getItem('heritage_object_links');
          if (localL) setObjectLinks(JSON.parse(localL));
        }

        // Load daily digests
        const { data: dData, error: dError } = await supabase.from('daily_digests').select('*');
        if (!dError && dData) {
          setDailyDigests(dData);
          localStorage.setItem('heritage_daily_digests', JSON.stringify(dData));
        } else {
          const localD = localStorage.getItem('heritage_daily_digests');
          if (localD) setDailyDigests(JSON.parse(localD));
        }

      } catch (err) {
        console.warn('Recovering knowledge state from cache:', err);
        const localK = localStorage.getItem('heritage_knowledge_items');
        if (localK) setKnowledgeItems(JSON.parse(localK));
        const localL = localStorage.getItem('heritage_object_links');
        if (localL) setObjectLinks(JSON.parse(localL));
        const localD = localStorage.getItem('heritage_daily_digests');
        if (localD) setDailyDigests(JSON.parse(localD));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isOnline, refreshKey]);

  const addKnowledgeItem = async (
    title: string,
    content?: string,
    type?: string,
    sourceUrl?: string,
    topic?: string,
    summary?: string,
    createdFromInboxItemId?: string
  ): Promise<string> => {
    if (!user) throw new Error('User must be authenticated to add knowledge items');

    const newItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      title,
      content,
      type,
      source_url: sourceUrl,
      topic,
      summary,
      created_from_inbox_item_id: createdFromInboxItemId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newItem, ...knowledgeItems];
    setKnowledgeItems(updated);
    localStorage.setItem('heritage_knowledge_items', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('knowledge_items').insert(newItem);
      if (error) throw error;
    }

    return newItem.id;
  };

  const updateKnowledgeItem = async (id: string, updates: Partial<Omit<KnowledgeItem, 'id' | 'user_id' | 'created_at'>>) => {
    const updated = knowledgeItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        } as KnowledgeItem;
      }
      return item;
    });

    setKnowledgeItems(updated);
    localStorage.setItem('heritage_knowledge_items', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('knowledge_items').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    }
  };

  const deleteKnowledgeItem = async (id: string) => {
    const updated = knowledgeItems.filter((item) => item.id !== id);
    setKnowledgeItems(updated);
    localStorage.setItem('heritage_knowledge_items', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('knowledge_items').delete().eq('id', id);
      if (error) throw error;
    }
  };

  const addObjectLink = async (
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType?: string
  ) => {
    if (!user) throw new Error('User must be authenticated to link objects');

    // Prevent duplicate links
    const exists = objectLinks.some(
      (link) =>
        link.source_type === sourceType &&
        link.source_id === sourceId &&
        link.target_type === targetType &&
        link.target_id === targetId
    );
    if (exists) return;

    const newLink: ObjectLink = {
      id: crypto.randomUUID(),
      user_id: user.id,
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      relationship_type: relationshipType,
      created_at: new Date().toISOString(),
    };

    const updated = [...objectLinks, newLink];
    setObjectLinks(updated);
    localStorage.setItem('heritage_object_links', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('object_links').insert(newLink);
      if (error) throw error;
    }
  };

  const deleteObjectLink = async (id: string) => {
    const updated = objectLinks.filter((link) => link.id !== id);
    setObjectLinks(updated);
    localStorage.setItem('heritage_object_links', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('object_links').delete().eq('id', id);
      if (error) throw error;
    }
  };

  const getDailyDigestForDate = async (date: string): Promise<DailyDigest | null> => {
    const existing = dailyDigests.find((d) => d.date === date);
    if (existing) return existing;

    if (isOnline && user) {
      const { data, error } = await supabase.from('daily_digests').select('*').eq('date', date).single();
      if (!error && data) {
        setDailyDigests((prev) => [...prev.filter((d) => d.date !== date), data]);
        return data;
      }
    }
    return null;
  };

  const upsertDailyDigest = async (date: string, updates: Partial<Omit<DailyDigest, 'id' | 'user_id' | 'date' | 'created_at'>>) => {
    if (!user) throw new Error('User must be authenticated to log digests');

    const existingIndex = dailyDigests.findIndex((d) => d.date === date);
    const updated = [...dailyDigests];

    let targetDigest: DailyDigest;
    if (existingIndex >= 0) {
      targetDigest = {
        ...updated[existingIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      updated[existingIndex] = targetDigest;
    } else {
      targetDigest = {
        id: crypto.randomUUID(),
        user_id: user.id,
        date,
        summary: updates.summary || '',
        captured_count: updates.captured_count || 0,
        processed_count: updates.processed_count || 0,
        knowledge_count: updates.knowledge_count || 0,
        tasks_created_count: updates.tasks_created_count || 0,
        flashcards_created_count: updates.flashcards_created_count || 0,
        open_questions: updates.open_questions || [],
        important_insights: updates.important_insights || [],
        journal_entries_count: updates.journal_entries_count || 0,
        projects_touched_count: updates.projects_touched_count || 0,
        tomorrow_inherits: updates.tomorrow_inherits || '',
        suggested_actions: updates.suggested_actions || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated.push(targetDigest);
    }

    setDailyDigests(updated);
    localStorage.setItem('heritage_daily_digests', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('daily_digests').upsert(targetDigest);
      if (error) throw error;
    }
  };

  return (
    <KnowledgeContext.Provider
      value={{
        knowledgeItems,
        objectLinks,
        dailyDigests,
        loading,
        addKnowledgeItem,
        updateKnowledgeItem,
        deleteKnowledgeItem,
        addObjectLink,
        deleteObjectLink,
        getDailyDigestForDate,
        upsertDailyDigest,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
};
