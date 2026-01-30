import { supabase } from '@/lib/supabase';
import type { Location, PrayerSession, SessionWithDetails } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useToastStore } from './toastStore';

interface SessionState {
  sessions: SessionWithDetails[];
  attendingSessions: Set<string>;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  realtimeChannel: RealtimeChannel | null;

  // Actions
  fetchSessions: (params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  }) => Promise<void>;
  fetchAttendingSessions: (userId: string) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<{ error: Error | null; data: PrayerSession | null }>;
  joinSession: (sessionId: string, userId: string) => Promise<{ error: Error | null }>;
  leaveSession: (sessionId: string, userId: string) => Promise<{ error: Error | null }>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
  clearError: () => void;
}

interface CreateSessionInput {
  prayerType: string;
  prayerSpaceId?: string;
  customLocation?: Location;
  customLocationName?: string;
  scheduledTime: Date;
  notes?: string;
  createdBy: string;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  attendingSessions: new Set<string>(),
  isLoading: false,
  error: null,
  hasMore: true,
  realtimeChannel: null,

  fetchSessions: async ({ latitude, longitude, radiusMeters = 15000 }) => {
    set({ isLoading: true, error: null });

    const fromTime = new Date().toISOString();
    try {
      const { data, error } = await supabase.rpc('get_sessions_within_radius', {
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radiusMeters,
        from_time: fromTime,
        limit_count: 50,
      });

      if (__DEV__) {
        console.log('[fetchSessions]', {
          latitude,
          longitude,
          radiusMeters,
          from_time: fromTime,
          resultCount: data?.length ?? 0,
          error: error?.message ?? null,
        });
      }

      if (error) throw error;

      set({
        sessions: data as SessionWithDetails[],
        isLoading: false,
        hasMore: data.length === 50,
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      if (__DEV__) {
        console.log('[fetchSessions] error', (error as Error).message);
      }
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  fetchAttendingSessions: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_attendees')
        .select('session_id')
        .eq('user_id', userId);

      if (error) throw error;

      const attendingSet = new Set<string>(data.map((row) => row.session_id));
      set({ attendingSessions: attendingSet });
    } catch (error) {
      console.error('Error fetching attending sessions:', error);
    }
  },

  createSession: async (input) => {
    try {
      // Build the insert object
      const insertData: Record<string, unknown> = {
        prayer_type: input.prayerType,
        scheduled_time: input.scheduledTime.toISOString(),
        created_by: input.createdBy,
        notes: input.notes,
      };

      if (input.prayerSpaceId) {
        insertData.prayer_space_id = input.prayerSpaceId;
      } else if (input.customLocation) {
        // Use EWKT with SRID so Postgres stores geography correctly for get_sessions_within_radius
        insertData.custom_location = `SRID=4326;POINT(${input.customLocation.longitude} ${input.customLocation.latitude})`;
        insertData.custom_location_name = input.customLocationName;
      }

      const { data, error } = await supabase
        .from('prayer_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return { error: null, data: data as PrayerSession };
    } catch (error) {
      console.error('Error creating session:', error);
      return { error: error as Error, data: null };
    }
  },

  joinSession: async (sessionId, userId) => {
    // Optimistic update
    set((state) => ({
      attendingSessions: new Set(state.attendingSessions).add(sessionId),
      sessions: state.sessions.map((s) =>
        s.session_id === sessionId
          ? { ...s, attendee_count: s.attendee_count + 1 }
          : s
      ),
    }));

    try {
      const { error } = await supabase
        .from('session_attendees')
        .insert({
          session_id: sessionId,
          user_id: userId,
        });

      if (error) {
        // Rollback optimistic update
        set((state) => {
          const next = new Set(state.attendingSessions);
          next.delete(sessionId);
          return {
            attendingSessions: next,
            sessions: state.sessions.map((s) =>
              s.session_id === sessionId
                ? { ...s, attendee_count: Math.max(0, s.attendee_count - 1) }
                : s
            ),
          };
        });

        // Handle already joined (unique constraint violation)
        if (error.code === '23505') {
          return { error: new Error('You have already joined this prayer') };
        }
        throw error;
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  leaveSession: async (sessionId, userId) => {
    // Optimistic update
    set((state) => {
      const next = new Set(state.attendingSessions);
      next.delete(sessionId);
      return {
        attendingSessions: next,
        sessions: state.sessions.map((s) =>
          s.session_id === sessionId
            ? { ...s, attendee_count: Math.max(0, s.attendee_count - 1) }
            : s
        ),
      };
    });

    try {
      const { error } = await supabase
        .from('session_attendees')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        // Rollback optimistic update
        set((state) => ({
          attendingSessions: new Set(state.attendingSessions).add(sessionId),
          sessions: state.sessions.map((s) =>
            s.session_id === sessionId
              ? { ...s, attendee_count: s.attendee_count + 1 }
              : s
          ),
        }));
        useToastStore.getState().error('Failed to leave prayer');
        throw error;
      }

      useToastStore.getState().info('Left prayer');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  subscribeToRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) return; // Already subscribed

    const channel = supabase
      .channel('session_attendees_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_attendees',
        },
        (payload) => {
          const { sessions } = get();
          const sessionId = (payload.new as { session_id?: string })?.session_id ||
            (payload.old as { session_id?: string })?.session_id;

          if (!sessionId) return;

          // Update attendee count based on event type
          if (payload.eventType === 'INSERT') {
            set({
              sessions: sessions.map((s) =>
                s.session_id === sessionId
                  ? { ...s, attendee_count: s.attendee_count + 1 }
                  : s
              ),
            });
          } else if (payload.eventType === 'DELETE') {
            set({
              sessions: sessions.map((s) =>
                s.session_id === sessionId
                  ? { ...s, attendee_count: Math.max(0, s.attendee_count - 1) }
                  : s
              ),
            });
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  clearError: () => set({ error: null }),
}));
