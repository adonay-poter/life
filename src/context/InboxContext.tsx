'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getLocalDateString } from '@/utils/dateUtils';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { recordActivityEvent } from '@/utils/activityEvents';
import { CLIENT_STORE_SYNC_EVENT, emitClientStoreSync, readStoredJson } from '@/utils/clientStoreSync';

export interface InboxItem {
  id: string;
  type: 'text' | 'url' | 'snippet' | 'thought' | 'idea' | 'task' | 'photo' | 'quote' | 'code' | 'question' | 'journal' | 'book_note' | 'course_note' | 'decision' | 'resource';
  title: string;
  url?: string;
  source_url?: string;
  attachment_url?: string;
  summary?: string;
  content?: string;
  tags: string[];
  status: 'unprocessed' | 'processed' | 'snoozed' | 'archived' | 'unsorted' | 'task' | 'academy' | 'knowledge';
  created_at: string;
  snoozed_until?: string;
  processed_at?: string;
  project_id?: string;
  ai_suggested_type?: string;
  ai_suggested_destination?: string;
  ai_suggested_action?: string;
}

interface InboxContextProps {
  inboxItems: InboxItem[];
  loading: boolean;
  addInboxItem: (
    type: InboxItem['type'],
    title: string,
    url?: string,
    content?: string,
    tags?: string[],
    status?: InboxItem['status'],
    projectId?: string,
    extraFields?: Partial<Pick<InboxItem, 'source_url' | 'attachment_url' | 'summary' | 'ai_suggested_type' | 'ai_suggested_destination' | 'ai_suggested_action' | 'snoozed_until' | 'processed_at'>>
  ) => Promise<string>;
  updateInboxItemStatus: (id: string, status: InboxItem['status'], projectId?: string, snoozedUntil?: string) => Promise<void>;
  updateInboxItem: (id: string, updates: Partial<Omit<InboxItem, 'id' | 'created_at'>>) => Promise<void>;
  deleteInboxItem: (id: string) => Promise<void>;
  autoTagItem: (id: string) => Promise<string[]>;
  autoTagAllItems: (onlyUntagged?: boolean) => Promise<number>;
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
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, refreshKey } = useSystem();
  const { user } = useAuth();
  const inboxItemsRef = useRef<InboxItem[]>([]);

  useEffect(() => {
    inboxItemsRef.current = inboxItems;
  }, [inboxItems]);

  const commitInboxItems = (updater: InboxItem[] | ((current: InboxItem[]) => InboxItem[])) => {
    let nextItems: InboxItem[] = [];

    setInboxItems((current) => {
      nextItems = typeof updater === 'function' ? updater(current) : updater;
      inboxItemsRef.current = nextItems;
      localStorage.setItem('heritage_inbox', JSON.stringify(nextItems));
      emitClientStoreSync('heritage_inbox');
      return nextItems;
    });

    return nextItems;
  };

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
          return { ...item, status: 'unprocessed', snoozed_until: undefined } as InboxItem;
        }
        return item;
      });

      if (hasChanges) {
        setInboxItems(checkedItems);
        localStorage.setItem('heritage_inbox', JSON.stringify(checkedItems));
        if (isOnline) {
          const expired = checkedItems.filter(
            (item) =>
              item.status === 'unprocessed' &&
              !item.snoozed_until &&
              loadedItems.find((o) => o.id === item.id)?.status === 'snoozed'
          );
          Promise.all(
            expired.map((item) =>
              supabase.from('inbox_items').update({ status: 'unprocessed', snoozed_until: null }).eq('id', item.id)
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => {
      const stored = readStoredJson<InboxItem[]>('heritage_inbox');
      if (stored) {
        inboxItemsRef.current = stored;
        setInboxItems(stored);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'heritage_inbox') {
        syncFromStorage();
      }
    };

    const handleStoreSync = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === 'heritage_inbox') {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CLIENT_STORE_SYNC_EVENT, handleStoreSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CLIENT_STORE_SYNC_EVENT, handleStoreSync);
    };
  }, []);

  const addInboxItem = async (
    type: InboxItem['type'],
    title: string,
    url?: string,
    content?: string,
    tags: string[] = [],
    status: InboxItem['status'] = 'unprocessed',
    projectId?: string,
    extraFields?: Partial<Pick<InboxItem, 'source_url' | 'attachment_url' | 'summary' | 'ai_suggested_type' | 'ai_suggested_destination' | 'ai_suggested_action' | 'snoozed_until' | 'processed_at'>>
  ) => {
    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      type,
      title,
      url,
      content,
      tags,
      status,
      project_id: projectId,
      created_at: new Date().toISOString(),
      ...extraFields
    };

    commitInboxItems((current) => [...current, newItem]);

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').insert(newItem);
      if (error) throw error;

      // Tagging happens in the background so capture stays instant. The Edge Function
      // authenticates as the current user and merges its tags with any manual ones.
      void supabase.functions.invoke('tag-inbox-item', {
        body: { inboxItemId: newItem.id },
      }).then(({ data, error }) => {
        if (error) {
          console.warn('Background inbox tagging failed:', error);
          return;
        }

        if (Array.isArray(data?.tags)) {
          commitInboxItems((current) => current.map((item) => (
            item.id === newItem.id ? { ...item, tags: data.tags } : item
          )));
        }
      }).catch((error) => {
        console.warn('Background inbox tagging failed:', error);
      });

      if (user) {
        await recordActivityEvent(supabase, {
          userId: user.id,
          eventType: 'inbox_item_created',
          entityType: 'inbox_item',
          entityId: newItem.id,
          metadata: { type: newItem.type, status: newItem.status, project_id: newItem.project_id },
        });
      }
    }

    return newItem.id;
  };

  const updateInboxItemStatus = async (id: string, status: InboxItem['status'], projectId?: string, snoozedUntil?: string) => {
    const tomorrow = getLocalDateString(new Date(Date.now() + 86400000));
    const targetSnoozedUntil = status === 'snoozed' ? (snoozedUntil || tomorrow) : undefined;
    const processedAt = (status === 'processed' || status === 'task' || status === 'academy' || status === 'knowledge') ? new Date().toISOString() : undefined;
    commitInboxItems((current) => current.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          project_id: projectId || item.project_id,
          snoozed_until: targetSnoozedUntil,
          processed_at: processedAt || item.processed_at
        } as InboxItem;
      }
      return item;
    }));

    if (isOnline) {
      const dbUpdates: Record<string, unknown> = { status };
      if (projectId) dbUpdates.project_id = projectId;
      dbUpdates.snoozed_until = targetSnoozedUntil || null;
      if (processedAt) dbUpdates.processed_at = processedAt;
      const { error } = await supabase.from('inbox_items').update(dbUpdates).eq('id', id);
      if (error) throw error;
      if (user) {
        await recordActivityEvent(supabase, {
          userId: user.id,
          eventType: status === 'processed' || status === 'task' || status === 'academy' || status === 'knowledge'
            ? 'inbox_item_processed'
            : 'inbox_item_updated',
          entityType: 'inbox_item',
          entityId: id,
          metadata: dbUpdates as Record<string, unknown>,
        });
      }
    }
  };

  const updateInboxItem = async (id: string, updates: Partial<Omit<InboxItem, 'id' | 'created_at'>>) => {
    commitInboxItems((current) => current.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates
        } as InboxItem;
      }
      return item;
    }));

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').update(updates).eq('id', id);
      if (error) throw error;
      if (user) {
        await recordActivityEvent(supabase, {
          userId: user.id,
          eventType: 'inbox_item_updated',
          entityType: 'inbox_item',
          entityId: id,
          metadata: updates as Record<string, unknown>,
        });
      }
    }
  };

  const deleteInboxItem = async (id: string) => {
    commitInboxItems((current) => current.filter((item) => item.id !== id));

    if (isOnline) {
      const { error } = await supabase.from('inbox_items').delete().eq('id', id);
      if (error) throw error;
    }
  };

  const autoTagItem = async (id: string): Promise<string[]> => {
    if (!isOnline) return [];
    const { data, error } = await supabase.functions.invoke('tag-inbox-item', {
      body: { inboxItemId: id },
    });
    if (error) throw error;
    if (Array.isArray(data?.tags)) {
      commitInboxItems((current) => current.map((item) => (
        item.id === id ? { ...item, tags: data.tags } : item
      )));
      return data.tags;
    }
    return [];
  };

  const autoTagAllItems = async (onlyUntagged = true): Promise<number> => {
    const targets = inboxItems.filter((item) => (
      onlyUntagged ? (!item.tags || item.tags.length === 0 || (item.tags.length === 1 && item.tags[0] === '#inbox')) : true
    ));

    let count = 0;
    for (const target of targets) {
      try {
        await autoTagItem(target.id);
        count++;
      } catch (err) {
        console.error(`Failed to auto-tag item ${target.id}:`, err);
      }
    }
    return count;
  };

  return (
    <InboxContext.Provider
      value={{
        inboxItems,
        loading,
        addInboxItem,
        updateInboxItemStatus,
        deleteInboxItem,
        updateInboxItem,
        autoTagItem,
        autoTagAllItems
      }}
    >
      {children}
    </InboxContext.Provider>
  );
};
