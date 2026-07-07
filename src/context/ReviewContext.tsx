'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { useInbox } from './InboxContext';
import { useTaskProject } from './TaskProjectContext';
import { useKnowledge } from './KnowledgeContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { recordActivityEvent } from '@/utils/activityEvents';

export interface ReviewEntry {
  id: string;
  user_id: string;
  review_type: 'midday' | 'evening' | 'weekly';
  review_date: string;
  focus_text?: string;
  summary?: string;
  best_insight?: string;
  tomorrow_inherits?: string;
  answers: Record<string, any>;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggested_action?: string;
  status: 'open' | 'snoozed' | 'resolved' | 'archived';
  snoozed_until?: string;
  detected_at: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  
  // Excluded from DB, calculated for UI
  title?: string;
  metadata?: Record<string, any>;
}

interface ReviewContextProps {
  reviewEntries: ReviewEntry[];
  reviewQueueItems: ReviewQueueItem[];
  computedQueueItems: ReviewQueueItem[];
  loading: boolean;
  
  // Operations
  saveReviewEntry: (
    type: ReviewEntry['review_type'],
    date: string,
    updates: Partial<Omit<ReviewEntry, 'id' | 'user_id' | 'review_type' | 'review_date' | 'created_at'>>
  ) => Promise<void>;
  
  snoozeQueueItem: (itemId: string, itemType: string, snoozeUntilDateStr: string) => Promise<void>;
  resolveQueueItem: (itemId: string, itemType: string) => Promise<void>;
  deleteReviewQueueItem: (id: string) => Promise<void>;
}

const ReviewContext = createContext<ReviewContextProps | undefined>(undefined);

export const useReview = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
};

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviewEntries, setReviewEntries] = useState<ReviewEntry[]>([]);
  const [reviewQueueItems, setReviewQueueItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOnline, refreshKey } = useSystem();
  const { user } = useAuth();
  
  const inboxContext = useInbox();
  const taskProjectContext = useTaskProject();
  const knowledgeContext = useKnowledge();

  // Load Review Entries & Queue from Supabase or Cache
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setReviewEntries([]);
        setReviewQueueItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch review entries
        const { data: reData, error: reError } = await supabase
          .from('review_entries')
          .select('*')
          .order('review_date', { ascending: false });
        if (!reError && reData) {
          setReviewEntries(reData);
          localStorage.setItem('heritage_review_entries', JSON.stringify(reData));
        } else {
          const localRe = localStorage.getItem('heritage_review_entries');
          if (localRe) setReviewEntries(JSON.parse(localRe));
        }

        // Fetch review queue items
        const { data: rqData, error: rqError } = await supabase
          .from('review_queue_items')
          .select('*');
        if (!rqError && rqData) {
          setReviewQueueItems(rqData);
          localStorage.setItem('heritage_review_queue_items', JSON.stringify(rqData));
        } else {
          const localRq = localStorage.getItem('heritage_review_queue_items');
          if (localRq) setReviewQueueItems(JSON.parse(localRq));
        }
      } catch (err) {
        console.warn('Recovering review state from local cache:', err);
        const localRe = localStorage.getItem('heritage_review_entries');
        if (localRe) setReviewEntries(JSON.parse(localRe));
        const localRq = localStorage.getItem('heritage_review_queue_items');
        if (localRq) setReviewQueueItems(JSON.parse(localRq));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, isOnline, refreshKey]);

  // Compute live signals and merge them with review_queue_items (e.g. snoozes / resolutions)
  const computedQueueItems = useMemo(() => {
    const items: ReviewQueueItem[] = [];
    const seenKeys = new Set<string>();
    const todayStr = getLocalDateString();

    const pushUniqueItem = (item: ReviewQueueItem) => {
      const dedupeKey = `${item.item_type}:${item.item_id}:${item.reason}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);
      items.push(item);
    };
    
    // Helper to check if a specific item is resolved or currently snoozed
    const getStoredStatus = (itemId: string, itemType: string) => {
      const stored = reviewQueueItems.find(r => r.item_id === itemId && r.item_type === itemType);
      if (stored) {
        if (stored.status === 'snoozed' && stored.snoozed_until) {
          // If snooze expired, it wakes up
          if (stored.snoozed_until <= todayStr) {
            return { status: 'open', stored };
          }
        }
        return { status: stored.status, stored };
      }
      return { status: 'open', stored: null };
    };

    // 1. Inbox Triage Staleness: Unprocessed inbox item older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    inboxContext.inboxItems.forEach(item => {
      if (item.status === 'unprocessed' || item.status === 'unsorted') {
        const itemDate = new Date(item.created_at);
        const isStale = itemDate < twentyFourHoursAgo;
        const { status, stored } = getStoredStatus(item.id, 'inbox_item');
        
        if (status === 'open') {
          pushUniqueItem({
            id: stored?.id || `computed-inbox-${item.id}`,
            user_id: user?.id || '',
            item_type: 'inbox_item',
            item_id: item.id,
            reason: isStale ? 'Unprocessed capture older than 24 hours' : 'Unprocessed capture needing triage',
            severity: isStale ? 'medium' : 'low',
            suggested_action: 'Convert to task, knowledge note, or archive',
            status: 'open',
            detected_at: item.created_at || new Date().toISOString(),
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.created_at || new Date().toISOString(),
            title: item.title,
            metadata: { type: item.type, content: item.content, url: item.url }
          });
        }
      }
    });

    // 2. Project Staleness:
    // - Active projects with no next action (e.g. no incomplete tasks at all, or no task marked with high/medium priority)
    // - Active projects with no update/touch in 14 days
    taskProjectContext.projects.forEach(project => {
      if (!project.is_archived && project.status !== 'completed' && project.status !== 'cancelled') {
        const projectTasks = taskProjectContext.tasks.filter(t => t.project_id === project.id);
        const activeTasks = projectTasks.filter(t => t.status !== 'done');
        const { status, stored } = getStoredStatus(project.id, 'project');
        
        if (status === 'open') {
          // Check for no active tasks
          if (activeTasks.length === 0) {
            pushUniqueItem({
              id: stored?.id || `computed-project-no-action-${project.id}`,
              user_id: user?.id || '',
              item_type: 'project',
              item_id: project.id,
              reason: 'Active project has no next action/incomplete tasks',
              severity: 'medium',
              suggested_action: 'Create a next step task for this project',
              status: 'open',
              detected_at: project.created_at || new Date().toISOString(),
              created_at: project.created_at || new Date().toISOString(),
              updated_at: project.created_at || new Date().toISOString(),
              title: project.name,
              metadata: { area: project.area, deadline: project.deadline }
            });
          } else {
            // Check for staleness: no updates/progress in 14 days (based on created_at or due dates or task updates, we can fallback to checking if all tasks were created long ago)
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            const isStale = new Date(project.created_at || '') < fourteenDaysAgo && 
              projectTasks.every(t => new Date(t.created_at || '') < fourteenDaysAgo && (t.status !== 'done' || !t.due_date || new Date(t.due_date) < fourteenDaysAgo));
            
            if (isStale) {
              pushUniqueItem({
                id: stored?.id || `computed-project-stale-${project.id}`,
                user_id: user?.id || '',
                item_type: 'project',
                item_id: project.id,
                reason: 'Active project has seen no progress in 14 days',
                severity: 'medium',
                suggested_action: 'Review goals or archive if no longer active',
                status: 'open',
                detected_at: project.created_at || new Date().toISOString(),
                created_at: project.created_at || new Date().toISOString(),
                updated_at: project.created_at || new Date().toISOString(),
                title: project.name,
                metadata: { area: project.area, deadline: project.deadline, taskCount: projectTasks.length }
              });
            }
          }
        }
      }
    });

    // 3. Stale Knowledge: Questions unanswered for more than 3 days
    // Let's grab all daily digests that have open questions and check dates
    knowledgeContext.dailyDigests.forEach(digest => {
      const digestDate = new Date(digest.date);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (digestDate < threeDaysAgo && digest.open_questions && digest.open_questions.length > 0) {
        digest.open_questions.forEach((question, index) => {
          const qId = `${digest.id}-q-${index}`;
          const { status, stored } = getStoredStatus(qId, 'question');
          
          if (status === 'open') {
            pushUniqueItem({
              id: stored?.id || `computed-question-${qId}`,
              user_id: user?.id || '',
              item_type: 'question',
              item_id: qId,
              reason: 'Capture question has remained unanswered for over 3 days',
              severity: 'medium',
              suggested_action: 'Answer question in Midday Review or resolve',
              status: 'open',
              detected_at: digest.created_at || new Date().toISOString(),
              created_at: digest.created_at || new Date().toISOString(),
              updated_at: digest.created_at || new Date().toISOString(),
              title: question,
              metadata: { date: digest.date, digestId: digest.id }
            });
          }
        });
      }
    });

    // 4. Tasks Schedule Staleness: Active high priority tasks with no due date
    taskProjectContext.tasks.forEach(task => {
      if (task.status !== 'done' && task.priority === 'high' && !task.due_date) {
        const { status, stored } = getStoredStatus(task.id, 'task');
        if (status === 'open') {
          pushUniqueItem({
            id: stored?.id || `computed-task-${task.id}`,
            user_id: user?.id || '',
            item_type: 'task',
            item_id: task.id,
            reason: 'High priority task is unscheduled (no due date)',
            severity: 'low',
            suggested_action: 'Assign a due date or schedule in calendar',
            status: 'open',
            detected_at: task.created_at || new Date().toISOString(),
            created_at: task.created_at || new Date().toISOString(),
            updated_at: task.created_at || new Date().toISOString(),
            title: task.name,
            metadata: { description: task.description, priority: task.priority }
          });
        }
      }
    });

    // 5. Unreviewed Knowledge Notes (created but not reviewed, let's say older than 7 days)
    knowledgeContext.knowledgeItems.forEach(note => {
      const createdDate = new Date(note.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (createdDate < sevenDaysAgo) {
        const { status, stored } = getStoredStatus(note.id, 'knowledge');
        if (status === 'open') {
          pushUniqueItem({
            id: stored?.id || `computed-knowledge-${note.id}`,
            user_id: user?.id || '',
            item_type: 'knowledge',
            item_id: note.id,
            reason: 'Knowledge note has not been reviewed in over 7 days',
            severity: 'low',
            suggested_action: 'Add to review queue, create flashcards, or archive',
            status: 'open',
            detected_at: note.created_at || new Date().toISOString(),
            created_at: note.created_at || new Date().toISOString(),
            updated_at: note.created_at || new Date().toISOString(),
            title: note.title,
            metadata: { topic: note.topic, summary: note.summary }
          });
        }
      }
    });

    return items;
  }, [inboxContext.inboxItems, taskProjectContext.projects, taskProjectContext.tasks, knowledgeContext.dailyDigests, knowledgeContext.knowledgeItems, reviewQueueItems, user]);

  // Operations
  const saveReviewEntry = async (
    type: ReviewEntry['review_type'],
    date: string,
    updates: Partial<Omit<ReviewEntry, 'id' | 'user_id' | 'review_type' | 'review_date' | 'created_at'>>
  ) => {
    if (!user) throw new Error('User must be authenticated to save review entries');
    
    const existingIndex = reviewEntries.findIndex(r => r.review_date === date && r.review_type === type);
    const updated = [...reviewEntries];
    
    let targetEntry: ReviewEntry;
    if (existingIndex >= 0) {
      targetEntry = {
        ...updated[existingIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      updated[existingIndex] = targetEntry;
    } else {
      targetEntry = {
        id: crypto.randomUUID(),
        user_id: user.id,
        review_type: type,
        review_date: date,
        focus_text: updates.focus_text || '',
        summary: updates.summary || '',
        best_insight: updates.best_insight || '',
        tomorrow_inherits: updates.tomorrow_inherits || '',
        answers: updates.answers || {},
        completed_at: updates.completed_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updated.push(targetEntry);
    }
    
    setReviewEntries(updated);
    localStorage.setItem('heritage_review_entries', JSON.stringify(updated));
    
    if (isOnline) {
      const { error } = await supabase.from('review_entries').upsert(targetEntry);
      if (error) throw error;
      await recordActivityEvent(supabase, {
        userId: user.id,
        eventType: 'review_completed',
        entityType: 'review_entry',
        entityId: targetEntry.id,
        metadata: { review_type: type, review_date: date },
      });
    }
  };

  const snoozeQueueItem = async (itemId: string, itemType: string, snoozeUntilDateStr: string) => {
    if (!user) throw new Error('User must be authenticated to snooze review items');
    
    const existingIndex = reviewQueueItems.findIndex(r => r.item_id === itemId && r.item_type === itemType);
    const updated = [...reviewQueueItems];
    
    let targetItem: ReviewQueueItem;
    if (existingIndex >= 0) {
      targetItem = {
        ...updated[existingIndex],
        status: 'snoozed',
        snoozed_until: snoozeUntilDateStr,
        resolved_at: undefined,
        updated_at: new Date().toISOString()
      };
      updated[existingIndex] = targetItem;
    } else {
      targetItem = {
        id: crypto.randomUUID(),
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        reason: 'Snoozed review trigger',
        severity: 'medium',
        status: 'snoozed',
        snoozed_until: snoozeUntilDateStr,
        detected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updated.push(targetItem);
    }
    
    setReviewQueueItems(updated);
    localStorage.setItem('heritage_review_queue_items', JSON.stringify(updated));
    
    if (isOnline) {
      const { error } = await supabase.from('review_queue_items').upsert(targetItem);
      if (error) throw error;
    }
  };

  const resolveQueueItem = async (itemId: string, itemType: string) => {
    if (!user) throw new Error('User must be authenticated to resolve review items');
    
    const existingIndex = reviewQueueItems.findIndex(r => r.item_id === itemId && r.item_type === itemType);
    const updated = [...reviewQueueItems];
    
    let targetItem: ReviewQueueItem;
    if (existingIndex >= 0) {
      targetItem = {
        ...updated[existingIndex],
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updated[existingIndex] = targetItem;
    } else {
      targetItem = {
        id: crypto.randomUUID(),
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        reason: 'Resolved review trigger',
        severity: 'medium',
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        detected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updated.push(targetItem);
    }
    
    setReviewQueueItems(updated);
    localStorage.setItem('heritage_review_queue_items', JSON.stringify(updated));
    
    if (isOnline) {
      const { error } = await supabase.from('review_queue_items').upsert(targetItem);
      if (error) throw error;
    }
  };

  const deleteReviewQueueItem = async (id: string) => {
    const updated = reviewQueueItems.filter(r => r.id !== id);
    setReviewQueueItems(updated);
    localStorage.setItem('heritage_review_queue_items', JSON.stringify(updated));
    
    if (isOnline) {
      const { error } = await supabase.from('review_queue_items').delete().eq('id', id);
      if (error) throw error;
    }
  };

  return (
    <ReviewContext.Provider
      value={{
        reviewEntries,
        reviewQueueItems,
        computedQueueItems,
        loading,
        saveReviewEntry,
        snoozeQueueItem,
        resolveQueueItem,
        deleteReviewQueueItem
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
};
