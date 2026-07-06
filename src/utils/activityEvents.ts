import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivityEventPayload {
  userId: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordActivityEvent(
  supabase: SupabaseClient,
  payload: ActivityEventPayload
): Promise<void> {
  const { error } = await supabase.from('activity_events').insert({
    user_id: payload.userId,
    event_type: payload.eventType,
    entity_type: payload.entityType,
    entity_id: payload.entityId || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    console.warn('Failed to record activity event:', error.message);
  }
}
