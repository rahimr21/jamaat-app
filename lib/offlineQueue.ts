// Offline queue for syncing write operations when connection is restored
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useSessionStore } from '@/stores/sessionStore';
import { useToastStore } from '@/stores/toastStore';

const QUEUE_KEY = 'offline_queue';

export type OfflineAction =
  | { type: 'createSession'; payload: CreateSessionPayload }
  | { type: 'joinSession'; sessionId: string; userId: string }
  | { type: 'leaveSession'; sessionId: string; userId: string }
  | { type: 'cancelSession'; sessionId: string; userId: string };

interface CreateSessionPayload {
  prayerType: string;
  prayerSpaceId?: string;
  customLocation?: { latitude: number; longitude: number };
  customLocationName?: string;
  scheduledTime: string; // ISO string
  notes?: string;
  createdBy: string;
}

let isProcessing = false;
let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Initialize the offline queue - subscribe to network changes
 */
export function initOfflineQueue() {
  if (unsubscribeNetInfo) return; // Already initialized

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processQueue();
    }
  });

  // Process any pending items on startup if online
  NetInfo.fetch().then((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processQueue();
    }
  });
}

/**
 * Cleanup the offline queue subscription
 */
export function cleanupOfflineQueue() {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

/**
 * Add an action to the offline queue
 */
export async function enqueueAction(action: OfflineAction): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    useToastStore.getState().info('Saved offline. Will sync when back online.');
  } catch (error) {
    console.error('Error enqueuing offline action:', error);
  }
}

/**
 * Get the current queue
 */
async function getQueue(): Promise<OfflineAction[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the queue
 */
async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Process all queued actions
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queue = await getQueue();
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    const store = useSessionStore.getState();
    let successCount = 0;
    let failCount = 0;

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'createSession': {
            const { error } = await store.createSession({
              ...action.payload,
              scheduledTime: new Date(action.payload.scheduledTime),
            });
            if (error) throw error;
            successCount++;
            break;
          }
          case 'joinSession': {
            const { error } = await store.joinSession(action.sessionId, action.userId);
            // Ignore "already joined" errors
            if (error && !error.message.includes('already joined')) throw error;
            successCount++;
            break;
          }
          case 'leaveSession': {
            const { error } = await store.leaveSession(action.sessionId, action.userId);
            if (error) throw error;
            successCount++;
            break;
          }
          case 'cancelSession': {
            const { error } = await store.cancelSession(action.sessionId, action.userId);
            if (error) throw error;
            successCount++;
            break;
          }
        }
      } catch (error) {
        console.error('Error processing queued action:', action.type, error);
        failCount++;
      }
    }

    // Clear the queue after processing
    await clearQueue();

    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      useToastStore
        .getState()
        .success(`Synced ${successCount} offline action${successCount > 1 ? 's' : ''}`);
    } else if (failCount > 0) {
      useToastStore
        .getState()
        .error(`${failCount} action${failCount > 1 ? 's' : ''} failed to sync`);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Check if there are pending offline actions
 */
export async function hasPendingActions(): Promise<boolean> {
  const queue = await getQueue();
  return queue.length > 0;
}

/**
 * Get the count of pending actions
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
