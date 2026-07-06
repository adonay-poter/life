'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { isSupabaseConfigured, supabase } from '@/utils/supabaseClient';
import { SoulBlueprintSnapshot } from '@/utils/soulBlueprint';

interface RegenerateResult {
  status: 'updated' | 'unchanged';
  snapshot?: SoulBlueprintSnapshot | null;
  tokenEstimate?: number;
  generatedAt?: string | null;
  reason?: string;
}

interface SoulBlueprintContextValue {
  snapshot: SoulBlueprintSnapshot | null;
  loading: boolean;
  regenerating: boolean;
  refreshSnapshot: () => Promise<void>;
  regenerateBlueprint: () => Promise<RegenerateResult>;
}

const SoulBlueprintContext = createContext<SoulBlueprintContextValue | undefined>(undefined);

async function fetchLatestSnapshot(): Promise<SoulBlueprintSnapshot | null> {
  const { data, error } = await supabase
    .from('soul_blueprint_snapshots')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export const SoulBlueprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user } = useAuth();
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState<SoulBlueprintSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextSnapshot = await fetchLatestSnapshot();
      setSnapshot(nextSnapshot);
    } catch (error) {
      console.error('Failed to load Soul Blueprint snapshot:', error);
      showToast('Failed to load Soul Blueprint.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const regenerateBlueprint = async (): Promise<RegenerateResult> => {
    if (!session?.access_token) {
      throw new Error('You must be signed in to regenerate the blueprint.');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are missing.');
    }

    setRegenerating(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-soul-blueprint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ mode: 'manual' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to regenerate Soul Blueprint.');
      }

      const nextSnapshot =
        result.snapshot && typeof result.snapshot === 'object'
          ? (result.snapshot as SoulBlueprintSnapshot)
          : await fetchLatestSnapshot();

      setSnapshot(nextSnapshot || null);

      return {
        status: result.status,
        snapshot: nextSnapshot || null,
        tokenEstimate: result.tokenEstimate,
        generatedAt: result.generatedAt || nextSnapshot?.generated_at || null,
        reason: result.reason,
      };
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <SoulBlueprintContext.Provider
      value={{
        snapshot,
        loading,
        regenerating,
        refreshSnapshot,
        regenerateBlueprint,
      }}
    >
      {children}
    </SoulBlueprintContext.Provider>
  );
};

export function useSoulBlueprint() {
  const context = useContext(SoulBlueprintContext);

  if (!context) {
    throw new Error('useSoulBlueprint must be used within a SoulBlueprintProvider');
  }

  return context;
}
