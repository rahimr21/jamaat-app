import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Card, CardHeader, CardContent } from '@/components/ui';
import type { SessionWithDetails, PrayerType } from '@/types';

// Prayer icons mapping
const prayerIcons: Record<PrayerType, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌆',
  isha: '🌙',
  jummah: '🕌',
};

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Session Card Component
function SessionCard({ 
  session, 
  isAttending,
  isCreator,
  onJoin, 
  onLeave 
}: { 
  session: SessionWithDetails;
  isAttending: boolean;
  isCreator: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  return (
    <Card variant="outlined" className="mb-3">
      <CardHeader>
        <View className="flex-row items-center">
          <Text className="text-2xl mr-2">
            {prayerIcons[session.prayer_type as PrayerType]}
          </Text>
          <View>
            <Text className="text-lg font-semibold text-gray-900 capitalize">
              {session.prayer_type}
            </Text>
            <Text className="text-sm text-gray-500">
              {formatTime(session.scheduled_time)}
            </Text>
          </View>
        </View>
      </CardHeader>

      <CardContent>
        <View className="flex-row items-center mb-2">
          <Text className="text-gray-400 mr-2">📍</Text>
          <Text className="text-gray-600 flex-1" numberOfLines={1}>
            {session.space_name}
          </Text>
          <Text className="text-gray-400 text-sm">
            {formatDistance(session.distance_meters)}
          </Text>
        </View>

        {session.notes && (
          <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
            {session.notes}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Text className="text-gray-600 text-sm">
              {session.attendee_count} attending
            </Text>
            {isCreator && (
              <View className="ml-2 bg-primary-100 px-2 py-0.5 rounded">
                <Text className="text-primary-700 text-xs">You created</Text>
              </View>
            )}
          </View>

          {!isCreator && (
            <Pressable
              className={`px-4 py-2 rounded-lg ${isAttending ? 'bg-gray-100' : 'bg-primary-500'}`}
              onPress={isAttending ? onLeave : onJoin}
            >
              <Text className={`font-medium ${isAttending ? 'text-gray-700' : 'text-white'}`}>
                {isAttending ? 'Joined ✓' : 'Join'}
              </Text>
            </Pressable>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-6xl mb-4">🕌</Text>
      <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
        No prayers scheduled yet
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        Be the first to create a prayer session
      </Text>
      <Pressable
        className="bg-primary-500 px-6 py-3 rounded-xl active:bg-primary-600"
        onPress={() => router.push('/(tabs)/create')}
      >
        <Text className="text-white font-semibold">Create Prayer</Text>
      </Pressable>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { sessions, isLoading, error: sessionError, clearError, fetchSessions, joinSession, leaveSession } = useSessionStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [attendingSessions, setAttendingSessions] = useState<Set<string>>(new Set());

  // Fetch location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Use default location (Boston) if no permission
          setLocation({ latitude: 42.3601, longitude: -71.0589 });
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        setLocation({ latitude: 42.3601, longitude: -71.0589 });
      }
    };

    getLocation();
  }, []);

  // Fetch sessions when location is available (initial load)
  useEffect(() => {
    if (location) {
      fetchSessions(location);
    }
  }, [location, fetchSessions]);

  // Refetch when feed tab gains focus (e.g. returning from Create)
  useFocusEffect(
    useCallback(() => {
      if (location) fetchSessions(location);
    }, [location, fetchSessions])
  );

  const onRefresh = useCallback(async () => {
    if (!location) return;
    setRefreshing(true);
    await fetchSessions(location);
    setRefreshing(false);
  }, [location, fetchSessions]);

  const handleJoin = async (sessionId: string) => {
    if (!user) return;
    
    // Optimistic update
    setAttendingSessions(prev => new Set(prev).add(sessionId));
    
    const { error } = await joinSession(sessionId, user.id);
    if (error) {
      // Rollback on error
      setAttendingSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleLeave = async (sessionId: string) => {
    if (!user) return;
    
    // Optimistic update
    setAttendingSessions(prev => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    
    const { error } = await leaveSession(sessionId, user.id);
    if (error) {
      // Rollback on error
      setAttendingSessions(prev => new Set(prev).add(sessionId));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-primary-500">Jamaat</Text>
            {profile?.university_id && (
              <Text className="text-sm text-gray-500">Campus prayers</Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Text className="text-lg">⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* RPC error banner */}
      {sessionError && (
        <View className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex-row items-center justify-between">
          <Text className="text-red-700 text-sm flex-1 mr-2">{sessionError}</Text>
          <Pressable onPress={clearError} className="px-2 py-1">
            <Text className="text-red-600 text-sm font-medium">Dismiss</Text>
          </Pressable>
        </View>
      )}

      {/* Feed */}
      {sessions.length === 0 && !isLoading ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sessions}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              isAttending={attendingSessions.has(item.session_id)}
              isCreator={item.created_by_id === user?.id}
              onJoin={() => handleJoin(item.session_id)}
              onLeave={() => handleLeave(item.session_id)}
            />
          )}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Prayers
            </Text>
          }
        />
      )}

      {/* FAB */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg active:bg-primary-600"
        onPress={() => router.push('/(tabs)/create')}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
