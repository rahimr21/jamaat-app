// Aladhan Prayer Times API integration
// https://aladhan.com/prayer-times-api

import type { PrayerTimes, PrayerType } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';
const CACHE_KEY_PREFIX = 'prayer_times_';
const CACHE_EXPIRY_HOURS = 24;

interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: AladhanTimings;
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string };
        month: { number: number; en: string };
        year: string;
        designation: { abbreviated: string; expanded: string };
      };
      hijri: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string };
        year: string;
        designation: { abbreviated: string; expanded: string };
        holidays: string[];
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: { id: number; name: string };
      latitudeAdjustmentMethod: string;
      midnightMode: string;
      school: string;
    };
  };
}

interface CachedPrayerTimes {
  data: PrayerTimes;
  cachedAt: number;
  location: { latitude: number; longitude: number };
}

/**
 * Parse time string from Aladhan API (24h format) to Date object for today
 */
function parseTimeToDate(timeStr: string): Date {
  // Format: "HH:mm" or "HH:mm (TIMEZONE)"
  const cleaned = timeStr.split(' ')[0]; // Remove timezone suffix if present
  const [hours, minutes] = cleaned.split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

/**
 * Format Date to display time (e.g., "5:30 AM")
 */
export function formatPrayerTime(timeStr: string): string {
  const date = parseTimeToDate(timeStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get cache key for a specific date
 */
function getCacheKey(date: Date): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${CACHE_KEY_PREFIX}${dateStr}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedAt: number): boolean {
  const now = Date.now();
  const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  return now - cachedAt < expiryMs;
}

/**
 * Check if location is close enough to use cached data (within ~5km)
 */
function isLocationClose(
  cached: { latitude: number; longitude: number },
  current: { latitude: number; longitude: number }
): boolean {
  const threshold = 0.05; // ~5km
  return (
    Math.abs(cached.latitude - current.latitude) < threshold &&
    Math.abs(cached.longitude - current.longitude) < threshold
  );
}

/**
 * Get cached prayer times if available and valid
 */
async function getCachedPrayerTimes(
  latitude: number,
  longitude: number
): Promise<PrayerTimes | null> {
  try {
    const cacheKey = getCacheKey(new Date());
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const parsed: CachedPrayerTimes = JSON.parse(cached);

    if (!isCacheValid(parsed.cachedAt)) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    if (!isLocationClose(parsed.location, { latitude, longitude })) {
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Error reading prayer times cache:', error);
    return null;
  }
}

/**
 * Cache prayer times
 */
async function cachePrayerTimes(
  data: PrayerTimes,
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const cacheKey = getCacheKey(new Date());
    const cacheData: CachedPrayerTimes = {
      data,
      cachedAt: Date.now(),
      location: { latitude, longitude },
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // Clean up old cache entries (older than 7 days)
    const keys = await AsyncStorage.getAllKeys();
    const prayerKeys = keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX));
    const today = new Date();
    today.setDate(today.getDate() - 7);
    const cutoffStr = today.toISOString().split('T')[0];

    for (const key of prayerKeys) {
      const dateStr = key.replace(CACHE_KEY_PREFIX, '');
      if (dateStr < cutoffStr) {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error caching prayer times:', error);
  }
}

/**
 * Fetch prayer times from Aladhan API
 *
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param method - Calculation method (default: 2 = ISNA)
 * @param school - Juristic school (default: 0 = Shafi)
 */
export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 2, // ISNA
  school: number = 0 // Shafi
): Promise<PrayerTimes> {
  // Try cache first
  const cached = await getCachedPrayerTimes(latitude, longitude);
  if (cached) {
    return cached;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `${ALADHAN_BASE_URL}/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Aladhan API error: ${response.status}`);
    }

    const json: AladhanResponse = await response.json();

    if (json.code !== 200 || json.status !== 'OK') {
      throw new Error('Invalid response from Aladhan API');
    }

    const timings = json.data.timings;
    const dateInfo = json.data.date.gregorian;

    const prayerTimes: PrayerTimes = {
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      date: `${dateInfo.year}-${String(dateInfo.month.number).padStart(2, '0')}-${String(dateInfo.day).padStart(2, '0')}`,
    };

    // Cache the results
    await cachePrayerTimes(prayerTimes, latitude, longitude);

    return prayerTimes;
  } catch (error) {
    console.error('Error fetching prayer times:', error);

    // Try to return yesterday's cached data as fallback
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fallbackKey = getCacheKey(yesterday);

    try {
      const fallback = await AsyncStorage.getItem(fallbackKey);
      if (fallback) {
        const parsed: CachedPrayerTimes = JSON.parse(fallback);
        return parsed.data;
      }
    } catch {
      // Ignore fallback errors
    }

    throw error;
  }
}

/**
 * Determine the current or next prayer based on times
 */
export function getCurrentPrayer(prayerTimes: PrayerTimes): PrayerType {
  const now = new Date();
  const prayers: { type: PrayerType; time: string }[] = [
    { type: 'fajr', time: prayerTimes.fajr },
    { type: 'dhuhr', time: prayerTimes.dhuhr },
    { type: 'asr', time: prayerTimes.asr },
    { type: 'maghrib', time: prayerTimes.maghrib },
    { type: 'isha', time: prayerTimes.isha },
  ];

  // Find the current or next prayer
  for (let i = prayers.length - 1; i >= 0; i--) {
    const prayerTime = parseTimeToDate(prayers[i].time);
    if (now >= prayerTime) {
      return prayers[i].type;
    }
  }

  // Before Fajr, show Isha (from previous day)
  return 'isha';
}

/**
 * Get the next prayer and time until it
 */
export function getNextPrayer(
  prayerTimes: PrayerTimes
): { type: PrayerType; timeUntil: string } | null {
  const now = new Date();
  const prayers: { type: PrayerType; time: string }[] = [
    { type: 'fajr', time: prayerTimes.fajr },
    { type: 'dhuhr', time: prayerTimes.dhuhr },
    { type: 'asr', time: prayerTimes.asr },
    { type: 'maghrib', time: prayerTimes.maghrib },
    { type: 'isha', time: prayerTimes.isha },
  ];

  for (const prayer of prayers) {
    const prayerTime = parseTimeToDate(prayer.time);
    if (prayerTime > now) {
      const diffMs = prayerTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      const timeUntil = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return { type: prayer.type, timeUntil };
    }
  }

  // All prayers passed, next is tomorrow's Fajr
  const tomorrowFajr = parseTimeToDate(prayerTimes.fajr);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
  const diffMs = tomorrowFajr.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  return {
    type: 'fajr',
    timeUntil: `${hours}h ${mins}m`,
  };
}

/**
 * Get prayer time suggestion for session creation
 * Returns the next prayer time as a Date object
 */
export function suggestPrayerTime(prayerTimes: PrayerTimes, prayerType: PrayerType): Date {
  const timeStr = prayerTimes[prayerType as keyof Omit<PrayerTimes, 'date'>];
  if (!timeStr || typeof timeStr !== 'string') {
    return new Date();
  }

  const prayerTime = parseTimeToDate(timeStr);

  // If the prayer time has passed today, suggest tomorrow
  if (prayerTime <= new Date()) {
    prayerTime.setDate(prayerTime.getDate() + 1);
  }

  return prayerTime;
}
