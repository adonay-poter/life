import { useState, useEffect, useCallback, useMemo } from 'react';

export const LIMITS = {
  RPD: 20,
  RPM: 5,
  TPM: 250000,
};

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export function useRateLimit() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai_research_usage');
      if (stored) {
        setRequests(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load rate limits:', e);
    }
  }, []);

  // Save to localStorage when requests change
  useEffect(() => {
    try {
      if (requests.length > 0) {
        // Clean up old requests (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentRequests = requests.filter(r => r.timestamp > oneDayAgo);
        
        if (recentRequests.length !== requests.length) {
          setRequests(recentRequests);
          localStorage.setItem('ai_research_usage', JSON.stringify(recentRequests));
        } else {
          localStorage.setItem('ai_research_usage', JSON.stringify(requests));
        }
      }
    } catch (e) {
      console.error('Failed to save rate limits:', e);
    }
  }, [requests]);

  const recordUsage = useCallback((tokens: number = 0) => {
    setRequests(prev => [...prev, { timestamp: Date.now(), tokens }]);
  }, []);

  // Calculate current usage
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), [requests]);
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const currentRPD = requests.filter(r => r.timestamp > oneDayAgo).length;
  const currentRPM = requests.filter(r => r.timestamp > oneMinuteAgo).length;
  
  const currentTPM = requests
    .filter(r => r.timestamp > oneMinuteAgo)
    .reduce((sum, r) => sum + (r.tokens || 0), 0);

  const isRateLimited = currentRPD >= LIMITS.RPD || currentRPM >= LIMITS.RPM || currentTPM >= LIMITS.TPM;

  return {
    limits: LIMITS,
    currentRPD,
    currentRPM,
    currentTPM,
    isRateLimited,
    recordUsage
  };
}
