// Date/time utility functions using date-fns
import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isPast,
  isToday,
  isTomorrow,
  addMinutes,
  subMinutes,
  parseISO,
} from 'date-fns';

/**
 * Format a date to display time (e.g., "5:30 AM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format a date for display (e.g., "Today", "Tomorrow", "Jan 30")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

/**
 * Format a date with time (e.g., "Today at 5:30 PM" or "Jan 30 at 5:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return `${formatDate(d)} at ${formatTime(d)}`;
}

/**
 * Format relative time (e.g., "in 15 minutes", "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Check if a date is in the past
 */
export function isDatePast(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isPast(d);
}

/**
 * Check if a date is in the future
 */
export function isDateFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isAfter(d, new Date());
}

/**
 * Get a date that is N minutes before the given date
 */
export function getMinutesBefore(date: Date | string, minutes: number): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return subMinutes(d, minutes);
}

/**
 * Get a date that is N minutes after the given date
 */
export function getMinutesAfter(date: Date | string, minutes: number): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addMinutes(d, minutes);
}

/**
 * Check if date A is before date B
 */
export function isBeforeDate(dateA: Date | string, dateB: Date | string): boolean {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB;
  return isBefore(a, b);
}

/**
 * Parse an ISO string to Date
 */
export function parseISOString(isoString: string): Date {
  return parseISO(isoString);
}

/**
 * Format time remaining until a date (e.g., "15m", "2h 30m")
 */
export function formatTimeUntil(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}
