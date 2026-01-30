import type { PrayerTimes } from '@/types';
import { formatPrayerTime, getCurrentPrayer, getNextPrayer, suggestPrayerTime } from './aladhan';

describe('aladhan utilities', () => {
  const mockPrayerTimes: PrayerTimes = {
    fajr: '05:30',
    dhuhr: '12:15',
    asr: '15:30',
    maghrib: '18:00',
    isha: '19:30',
    date: '2026-01-30',
  };

  describe('formatPrayerTime', () => {
    it('should format 24h time to 12h format', () => {
      expect(formatPrayerTime('05:30')).toBe('5:30 AM');
      expect(formatPrayerTime('12:15')).toBe('12:15 PM');
      expect(formatPrayerTime('15:30')).toBe('3:30 PM');
      expect(formatPrayerTime('00:00')).toBe('12:00 AM');
    });

    it('should handle time with timezone suffix', () => {
      expect(formatPrayerTime('05:30 (EST)')).toBe('5:30 AM');
    });
  });

  describe('getCurrentPrayer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return fajr after fajr time', () => {
      jest.setSystemTime(new Date('2026-01-30T06:00:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('fajr');
    });

    it('should return dhuhr after dhuhr time', () => {
      jest.setSystemTime(new Date('2026-01-30T13:00:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('dhuhr');
    });

    it('should return asr after asr time', () => {
      jest.setSystemTime(new Date('2026-01-30T16:00:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('asr');
    });

    it('should return maghrib after maghrib time', () => {
      jest.setSystemTime(new Date('2026-01-30T18:30:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('maghrib');
    });

    it('should return isha after isha time', () => {
      jest.setSystemTime(new Date('2026-01-30T20:00:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('isha');
    });

    it('should return isha before fajr (late night)', () => {
      jest.setSystemTime(new Date('2026-01-30T03:00:00'));
      expect(getCurrentPrayer(mockPrayerTimes)).toBe('isha');
    });
  });

  describe('getNextPrayer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return next prayer with time until', () => {
      jest.setSystemTime(new Date('2026-01-30T11:45:00'));
      const result = getNextPrayer(mockPrayerTimes);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('dhuhr');
      expect(result?.timeUntil).toBe('30m');
    });

    it('should return fajr when all prayers passed', () => {
      jest.setSystemTime(new Date('2026-01-30T23:00:00'));
      const result = getNextPrayer(mockPrayerTimes);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('fajr');
    });

    it('should format hours and minutes correctly', () => {
      jest.setSystemTime(new Date('2026-01-30T10:15:00'));
      const result = getNextPrayer(mockPrayerTimes);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('dhuhr');
      expect(result?.timeUntil).toBe('2h 0m');
    });
  });

  describe('suggestPrayerTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return prayer time for today if not passed', () => {
      jest.setSystemTime(new Date('2026-01-30T10:00:00'));
      const result = suggestPrayerTime(mockPrayerTimes, 'dhuhr');
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(15);
    });

    it('should return prayer time for tomorrow if passed', () => {
      jest.setSystemTime(new Date('2026-01-30T13:00:00'));
      const result = suggestPrayerTime(mockPrayerTimes, 'dhuhr');
      // Should be tomorrow
      expect(result.getDate()).toBe(31);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(15);
    });

    it('should return current time for jummah (not in times object)', () => {
      jest.setSystemTime(new Date('2026-01-30T10:00:00'));
      const result = suggestPrayerTime(mockPrayerTimes, 'jummah');
      // Should return approximately current time since jummah isn't in prayer times
      expect(result).toBeInstanceOf(Date);
    });
  });
});
