// Expo Push Notifications API
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Must be on physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  try {
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('Project ID not found for push notifications');
      // In development, try without projectId
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
    } else {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData.data;
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#28A745',
    });

    await Notifications.setNotificationChannelAsync('prayers', {
      name: 'Prayer Notifications',
      description: 'Notifications about nearby prayers and prayer joins',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#28A745',
    });
  }

  return token;
}

/**
 * Save push token to database
 */
export async function savePushToken(
  userId: string,
  token: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error saving push token:', error);
    return { error: error as Error };
  }
}

/**
 * Remove push token from database (e.g., on logout)
 */
export async function removePushToken(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: null })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error removing push token:', error);
    return { error: error as Error };
  }
}

/**
 * Check if push notifications are enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Add listener for incoming notifications
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification response (user tapped notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (for testing or reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  triggerSeconds?: number
): Promise<string> {
  const trigger: Notifications.NotificationTriggerInput = triggerSeconds
    ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
    : null;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific scheduled notification by ID
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// ============================================
// PRAYER SESSION REMINDERS
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_STORAGE_KEY = 'prayer_reminders';
const REMINDER_MINUTES_BEFORE = 15;

interface PrayerReminders {
  [sessionId: string]: string; // sessionId -> notificationId
}

/**
 * Get stored prayer reminders mapping
 */
async function getStoredReminders(): Promise<PrayerReminders> {
  try {
    const data = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save prayer reminders mapping
 */
async function saveStoredReminders(reminders: PrayerReminders): Promise<void> {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
}

/**
 * Schedule a 15-minute reminder for a prayer session
 */
export async function schedulePrayerReminder(
  sessionId: string,
  prayerType: string,
  scheduledTime: string | Date,
  spaceName: string
): Promise<string | null> {
  try {
    const sessionDate = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;

    const reminderDate = new Date(sessionDate.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);
    const now = new Date();

    // Don't schedule if reminder time is in the past
    if (reminderDate <= now) {
      return null;
    }

    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);

    // Format time for notification
    const timeStr = sessionDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayerType.charAt(0).toUpperCase() + prayerType.slice(1)} in 15 minutes`,
        body: `${spaceName} at ${timeStr}`,
        data: { sessionId, type: 'prayer_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilReminder,
      },
    });

    // Store the mapping
    const reminders = await getStoredReminders();
    reminders[sessionId] = notificationId;
    await saveStoredReminders(reminders);

    return notificationId;
  } catch (error) {
    console.error('Error scheduling prayer reminder:', error);
    return null;
  }
}

/**
 * Cancel a scheduled prayer reminder
 */
export async function cancelPrayerReminder(sessionId: string): Promise<void> {
  try {
    const reminders = await getStoredReminders();
    const notificationId = reminders[sessionId];

    if (notificationId) {
      await cancelScheduledNotification(notificationId);
      delete reminders[sessionId];
      await saveStoredReminders(reminders);
    }
  } catch (error) {
    console.error('Error cancelling prayer reminder:', error);
  }
}

/**
 * Reschedule reminders for all joined sessions (call on app start)
 */
export async function rescheduleAllPrayerReminders(
  joinedSessions: Array<{
    sessionId: string;
    prayerType: string;
    scheduledTime: string;
    spaceName: string;
  }>
): Promise<void> {
  // Clear all existing reminders
  const existingReminders = await getStoredReminders();
  for (const notificationId of Object.values(existingReminders)) {
    try {
      await cancelScheduledNotification(notificationId);
    } catch {
      // Ignore errors for already-fired notifications
    }
  }

  // Clear storage
  await saveStoredReminders({});

  // Schedule new reminders for future sessions
  for (const session of joinedSessions) {
    await schedulePrayerReminder(
      session.sessionId,
      session.prayerType,
      session.scheduledTime,
      session.spaceName
    );
  }
}

/**
 * Check if reminders are enabled in user preferences
 */
export function shouldScheduleReminders(
  notificationPreferences: { daily_reminders?: boolean } | null | undefined
): boolean {
  // Use daily_reminders preference for now, or could add a specific prayer_reminders pref
  return notificationPreferences?.daily_reminders ?? false;
}
