// Custom app types
export type PrayerType = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jummah';

export type SpaceType = 'campus' | 'masjid' | 'community_center' | 'custom';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  is_student: boolean;
  university_id: string | null;
  expo_push_token: string | null;
  notification_preferences: NotificationPreferences;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  new_prayers: boolean;
  prayer_joined: boolean;
  daily_reminders: boolean;
}

export interface University {
  id: string;
  name: string;
  location: Location | null;
  email_domain: string | null;
  city: string | null;
  state: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface PrayerSpace {
  id: string;
  name: string;
  location: Location;
  university_id: string | null;
  space_type: SpaceType;
  description: string | null;
  created_by: string | null;
  is_verified: boolean;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface PrayerSession {
  id: string;
  prayer_space_id: string | null;
  custom_location: Location | null;
  custom_location_name: string | null;
  prayer_type: PrayerType;
  scheduled_time: string;
  notes: string | null;
  created_by: string;
  is_active: boolean;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionAttendee {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
}

// RPC return types
export interface SessionWithDetails {
  session_id: string;
  prayer_type: PrayerType;
  scheduled_time: string;
  space_name: string;
  space_type: SpaceType;
  location_lat: number;
  location_lng: number;
  distance_meters: number;
  attendee_count: number;
  notes: string | null;
  created_by_id: string;
  created_by_name: string;
  is_cancelled: boolean;
}
