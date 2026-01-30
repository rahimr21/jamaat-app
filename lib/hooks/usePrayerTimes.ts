// Prayer times hook with caching and auto-refresh
import { useCallback, useEffect, useState } from 'react';
import { fetchPrayerTimes, getCurrentPrayer, getNextPrayer } from '@/lib/api/aladhan';
import type { PrayerTimes, PrayerType } from '@/types';

interface UsePrayerTimesResult {
  prayerTimes: PrayerTimes | null;
  currentPrayer: PrayerType | null;
  nextPrayer: { type: PrayerType; timeUntil: string } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage prayer times based on user's location
 */
export function usePrayerTimes(
  latitude: number | null,
  longitude: number | null
): UsePrayerTimesResult {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerType | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ type: PrayerType; timeUntil: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimes = useCallback(async () => {
    if (latitude === null || longitude === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const times = await fetchPrayerTimes(latitude, longitude);
      setPrayerTimes(times);
      setCurrentPrayer(getCurrentPrayer(times));
      setNextPrayer(getNextPrayer(times));
    } catch (err) {
      console.error('Error in usePrayerTimes:', err);
      setError('Could not load prayer times');
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Fetch on mount or when location changes
  useEffect(() => {
    fetchTimes();
  }, [fetchTimes]);

  // Update current/next prayer every minute
  useEffect(() => {
    if (!prayerTimes) return;

    const updateCurrentPrayer = () => {
      setCurrentPrayer(getCurrentPrayer(prayerTimes));
      setNextPrayer(getNextPrayer(prayerTimes));
    };

    const interval = setInterval(updateCurrentPrayer, 60000); // Every minute
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // Refetch at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      fetchTimes();
    }, msUntilMidnight + 1000); // Add 1s buffer

    return () => clearTimeout(timeout);
  }, [fetchTimes]);

  return {
    prayerTimes,
    currentPrayer,
    nextPrayer,
    isLoading,
    error,
    refetch: fetchTimes,
  };
}
