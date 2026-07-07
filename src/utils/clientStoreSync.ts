'use client';

export const CLIENT_STORE_SYNC_EVENT = 'life:store-sync';

export type ClientStoreKey = 'heritage_inbox' | 'heritage_projects' | 'heritage_tasks';

export function emitClientStoreSync(key: ClientStoreKey) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CLIENT_STORE_SYNC_EVENT, { detail: { key } }));
}

export function readStoredJson<T>(key: ClientStoreKey): T | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
