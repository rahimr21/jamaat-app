// Session-related API functions
import { supabase } from '@/lib/supabase';

export interface SessionAttendee {
  user_id: string;
  display_name: string;
  joined_at: string;
}

/**
 * Fetch attendees for a specific session
 */
export async function fetchSessionAttendees(sessionId: string): Promise<{
  data: SessionAttendee[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('session_attendees')
      .select(
        `
        user_id,
        joined_at,
        users!inner (
          display_name
        )
      `
      )
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    // Transform the data to flatten the users join
    // Supabase returns users as an object (not array) when using !inner with single relation
    const attendees: SessionAttendee[] = (data ?? []).map((row) => {
      const users = row.users as unknown as { display_name: string } | { display_name: string }[];
      const displayName = Array.isArray(users) ? users[0]?.display_name : users?.display_name;
      return {
        user_id: row.user_id,
        display_name: displayName ?? 'Unknown',
        joined_at: row.joined_at,
      };
    });

    return { data: attendees, error: null };
  } catch (error) {
    console.error('Error fetching session attendees:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Cancel a prayer session (creator only)
 */
export async function cancelSession(
  sessionId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('prayer_sessions')
      .update({ is_cancelled: true })
      .eq('id', sessionId)
      .eq('created_by', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error cancelling session:', error);
    return { error: error as Error };
  }
}

/**
 * Check if user is the creator of a session
 */
export async function isSessionCreator(sessionId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('prayer_sessions')
      .select('created_by')
      .eq('id', sessionId)
      .single();

    if (error) return false;
    return data?.created_by === userId;
  } catch {
    return false;
  }
}
