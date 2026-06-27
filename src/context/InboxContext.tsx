'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getLocalDateString } from '@/utils/dateUtils';
import { useSystem } from './SystemContext';
import { useToast } from './ToastContext';

export interface InboxItem {
  id: string;
  type: 'text' | 'url' | 'snippet';
  title: string;
  url?: string;
  content?: string;
  tags: string[];
  status: 'unsorted' | 'task' | 'academy' | 'snoozed' | 'archived' | 'knowledge';
  created_at: string;
  snoozed_until?: string;
  project_id?: string;
}

interface InboxContextProps {
  inboxItems: InboxItem[];
  loading: boolean;
  addInboxItem: (
    type: 'text' | 'url' | 'snippet',
    title: string,
    url?: string,
    content?: string,
    tags?: string[],
    status?: InboxItem['status']
  ) => Promise<void>;
  updateInboxItemStatus: (id: string, status: InboxItem['status'], projectId?: string, snoozedUntil?: string) => Promise<void>;
  updateInboxItem: (id: string, updates: Partial<Omit<InboxItem, 'id' | 'created_at'>>) => Promise<void>;
  deleteInboxItem: (id: string) => Promise<void>;
}

const InboxContext = createContext<InboxContextProps | undefined>(undefined);

export const useInbox = () => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within an InboxProvider');
  }
  return context;
};

const MOCK_INBOX: InboxItem[] = [
  { id: 'i1', type: 'url', title: 'Hacker News', url: 'https://news.ycombinator.com', content: 'Aggregator of tech essays and startup articles.', tags: ['#read-later', '#idea'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i2', type: 'snippet', title: 'Hydration Guidelines', content: 'Ideal daily intake formula: Weight (kg) * 0.033 = Liters daily.', tags: ['#health'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i3', type: 'text', title: 'Purchase architectural journaling book', content: 'Matte cover sketchbook with grid dots for layout designs.', tags: ['#purchase'], status: 'unsorted', created_at: new Date().toISOString() },
  { id: 'i4', type: 'snippet', title: 'Deep Work Quote', content: '"If you don\'t produce, you won\'t thrive - no matter how skilled or talented you are." - Cal Newport', tags: ['#focus', '#quotes'], status: 'knowledge', created_at: new Date(Date.now() - 86400000).toISOString() }
];

export const InboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();

  useEffect(() => {
    const fetchInbox = async () => {
      setLoading(true);
      let loadedItems: InboxItem[] = [];
      try {
        const { data, error } = await supabase.from('inbox_items').select('*');
        if (!error && data && data.length > 0) {
          loadedItems = data;
          localStorage.setItem('heritage_inbox', JSON.stringify(data));
        } else {
          const local = localStorage.getItem('heritage_inbox');
          loadedItems = local ? JSON.parse(local) : MOCK_INBOX;
          if (!local && isOnline) {
            const { error } = await supabase.from('inbox_items').upsert(MOCK_INBOX);
        if (error) throw error;
          }
        }
      } catch (err) {
        console.warn('Recovering inbox from local cache:', err);
        const local = localStorage.getItem('heritage_inbox');
        loadedItems = local ? JSON.parse(local) : MOCK_INBOX;
      }

      // Wake up expired snoozed items
      const todayStr = getLocalDateString();
      let hasChanges = false;
      const checkedItems = loadedItems.map((item) => {
        if (item.status === 'snoozed' && item.snoozed_until && item.snoozed_until <= todayStr) {
          hasChanges = true;
          return { ...item, status: 'unsorted', snoozed_until: undefined } as InboxItem;
        }
        return item;
      });

      if (hasChanges) {
        setInboxItems(checkedItems);
        localStorage.setItem('heritage_inbox', JSON.stringify(checkedItems));
        if (isOnline) {
          const expired = checkedItems.filter(
            (item) =>
              item.status === 'unsorted' &&
              !item.snoozed_until &&
              loadedItems.find((o) => o.id === item.id)?.status === 'snoozed'
          );
          Promise.all(
            expired.map((item) =>
              supabase.from('inbox_items').update({ status: 'unsorted', snoozed_until: null }).eq('id', item.id)
            )
          ).catch((err) => console.warn('Failed to sync unsnoozed items to Supabase:', err));
        }
      } else {
        setInboxItems(loadedItems);
      }
      setLoading(false);
    };

    fetchInbox();
  }, [isOnline, refreshKey]);

  const addInboxItem = async (
    type: 'text' | 'url' | 'snippet',
    title: string,
    url?: string,
    content?: string,
    tags: string[] = [],
    status: InboxItem['status'] = 'unsorted'
  ) => {
    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      type,
      title,
      url,
      content,
      tags,
      status,
      created_at: new Date().toISOString()
    };

    const updated = [...inboxItems, newItem];
    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').insert(newItem);
        if (error) throw error;
    }
  };

  const updateInboxItemStatus = async (id: string, status: InboxItem['status'], projectId?: string, snoozedUntil?: string) => {
    const tomorrow = getLocalDateString(new Date(Date.now() + 86400000));
    const targetSnoozedUntil = status === 'snoozed' ? (snoozedUntil || tomorrow) : undefined;
    const updated = inboxItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          project_id: projectId || item.project_id,
          snoozed_until: targetSnoozedUntil
        } as InboxItem;
      }
      return item;
    });

    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (isOnline) {
      const dbUpdates: Record<string, unknown> = { status };
      if (projectId) dbUpdates.project_id = projectId;
      dbUpdates.snoozed_until = targetSnoozedUntil || null;
      const { error } = await supabase.from('inbox_items').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }
  };

  const updateInboxItem = async (id: string, updates: Partial<Omit<InboxItem, 'id' | 'created_at'>>) => {
    const updated = inboxItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates
        } as InboxItem;
      }
      return item;
    });

    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').update(updates).eq('id', id);
      if (error) throw error;
    }
  };

  const deleteInboxItem = async (id: string) => {
    const updated = inboxItems.filter((item) => item.id !== id);
    setInboxItems(updated);
    localStorage.setItem('heritage_inbox', JSON.stringify(updated));

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').delete().eq('id', id);
        if (error) throw error;
    }
  };

  return (
    <InboxContext.Provider
      value={{
        inboxItems,
        loading,
        addInboxItem,
        updateInboxItemStatus,
        deleteInboxItem,
        updateInboxItem
      }}
    >
      {children}
    </InboxContext.Provider>
  );
};
