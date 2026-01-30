import {
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeUntil,
  getMinutesAfter,
  getMinutesBefore,
  isBeforeDate,
  isDateFuture,
  isDatePast,
} from './date';

describe('date utilities', () => {
  // Use a fixed date for tests
  const fixedDate = new Date('2026-01-30T14:30:00');

  describe('formatTime', () => {
    it('should format a Date object to time string', () => {
      const result = formatTime(fixedDate);
      expect(result).toBe('2:30 PM');
    });

    it('should format an ISO string to time string', () => {
      const result = formatTime('2026-01-30T09:15:00');
      expect(result).toBe('9:15 AM');
    });

    it('should handle midnight', () => {
      const result = formatTime(new Date('2026-01-30T00:00:00'));
      expect(result).toBe('12:00 AM');
    });

    it('should handle noon', () => {
      const result = formatTime(new Date('2026-01-30T12:00:00'));
      expect(result).toBe('12:00 PM');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-30T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for today\'s date', () => {
      const today = new Date('2026-01-30T15:00:00');
      expect(formatDate(today)).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = new Date('2026-01-31T15:00:00');
      expect(formatDate(tomorrow)).toBe('Tomorrow');
    });

    it('should return formatted date for other dates', () => {
      const otherDate = new Date('2026-02-15T15:00:00');
      expect(formatDate(otherDate)).toBe('Feb 15');
    });
  });

  describe('formatDateTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-30T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format date and time together', () => {
      const date = new Date('2026-01-30T14:30:00');
      expect(formatDateTime(date)).toBe('Today at 2:30 PM');
    });
  });

  describe('isDatePast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      expect(isDatePast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      expect(isDatePast(futureDate)).toBe(false);
    });
  });

  describe('isDateFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      expect(isDateFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      expect(isDateFuture(pastDate)).toBe(false);
    });
  });

  describe('getMinutesBefore', () => {
    it('should return date N minutes before', () => {
      const date = new Date('2026-01-30T14:30:00');
      const result = getMinutesBefore(date, 15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(15);
    });
  });

  describe('getMinutesAfter', () => {
    it('should return date N minutes after', () => {
      const date = new Date('2026-01-30T14:30:00');
      const result = getMinutesAfter(date, 15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(45);
    });
  });

  describe('isBeforeDate', () => {
    it('should return true if date A is before date B', () => {
      const dateA = new Date('2026-01-30T10:00:00');
      const dateB = new Date('2026-01-30T14:00:00');
      expect(isBeforeDate(dateA, dateB)).toBe(true);
    });

    it('should return false if date A is after date B', () => {
      const dateA = new Date('2026-01-30T14:00:00');
      const dateB = new Date('2026-01-30T10:00:00');
      expect(isBeforeDate(dateA, dateB)).toBe(false);
    });
  });

  describe('formatTimeUntil', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-30T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "now" for past dates', () => {
      const pastDate = new Date('2026-01-30T11:00:00');
      expect(formatTimeUntil(pastDate)).toBe('now');
    });

    it('should format minutes only for short durations', () => {
      const date = new Date('2026-01-30T12:30:00');
      expect(formatTimeUntil(date)).toBe('30m');
    });

    it('should format hours and minutes for longer durations', () => {
      const date = new Date('2026-01-30T14:30:00');
      expect(formatTimeUntil(date)).toBe('2h 30m');
    });

    it('should format hours only when no minutes', () => {
      const date = new Date('2026-01-30T14:00:00');
      expect(formatTimeUntil(date)).toBe('2h');
    });
  });
});
