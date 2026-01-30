import { Card, CardContent, CardHeader } from '@/components/ui';
import { PrayerTimesStrip } from '@/components/prayer';
import { FeedSkeleton } from '@/components/common';
import { AttendeeListModal, LocationFilterModal, type LocationFilter } from '@/components/session';
import { usePrayerTimes } from '@/lib/hooks/usePrayerTimes';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { config } from '@/constants';
import { formatDistance } from '@/lib/utils/location';
import { formatTime, isDatePast } from '@/lib/utils/date';
import type { PrayerType, SessionWithDetails } from '@/types';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Prayer icons mapping
const prayerIcons: Record<PrayerType, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌆',
  isha: '🌙',
  jummah: '🕌',
};

// Session Card Component
function SessionCard({
  session,
  isAttending,
  isCreator,
  onJoin,
  onLeave,
  onCancel,
  onShowAttendees,
}: {
  session: SessionWithDetails;
  isAttending: boolean;
  isCreator: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onCancel: () => void;
  onShowAttendees: () => void;
}) {
  const isPast = isDatePast(session.scheduled_time);

  return (
    <Card variant="outlined" className={`mb-3 ${isPast ? 'opacity-60' : ''}`}>
      <CardHeader>
        <View className="flex-row items-center">
          <Text className="text-2xl mr-2">{prayerIcons[session.prayer_type as PrayerType]}</Text>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 capitalize">
              {session.prayer_type}
            </Text>
            <Text className="text-sm text-gray-500">{formatTime(session.scheduled_time)}</Text>
          </View>
          {isPast && (
            <View className="bg-gray-100 px-2 py-1 rounded">
              <Text className="text-gray-500 text-xs">Passed</Text>
            </View>
          )}
        </View>
      </CardHeader>

      <CardContent>
        <View className="flex-row items-center mb-2">
          <Text className="text-gray-400 mr-2">📍</Text>
          <Text className="text-gray-600 flex-1" numberOfLines={1}>
            {session.space_name}
          </Text>
          <Text className="text-gray-400 text-sm">{formatDistance(session.distance_meters)}</Text>
        </View>

        {session.notes && (
          <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
            {session.notes}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <Pressable onPress={onShowAttendees} className="flex-row items-center">
            <Text className="text-gray-600 text-sm underline">
              {session.attendee_count} attending
            </Text>
            {isCreator && (
              <View className="ml-2 bg-primary-100 px-2 py-0.5 rounded">
                <Text className="text-primary-700 text-xs">You created</Text>
              </View>
            )}
          </Pressable>

          {isPast ? (
            <Text className="text-gray-400 text-sm">Prayer time passed</Text>
          ) : isCreator ? (
            <Pressable className="px-4 py-2 rounded-lg bg-red-50" onPress={onCancel}>
              <Text className="font-medium text-red-600">Cancel</Text>
            </Pressable>
          ) : (
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
  const {
    sessions,
    attendingSessions,
    isLoading,
    isLoadingMore,
    error: sessionError,
    hasMore,
    clearError,
    fetchSessions,
    fetchMoreSessions,
    fetchAttendingSessions,
    joinSession,
    leaveSession,
    cancelSession,
    subscribeToRealtime,
    unsubscribeFromRealtime,
  } = useSessionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Location filter state
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({
    type: 'radius',
    radiusMeters: config.defaultRadiusMeters,
  });
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Attendee list modal state
  const [selectedSessionForAttendees, setSelectedSessionForAttendees] =
    useState<SessionWithDetails | null>(null);

  // Prayer times
  const effectiveLocation = locationFilter.campusLocation ?? deviceLocation;
  const {
    prayerTimes,
    currentPrayer,
    isLoading: prayerTimesLoading,
    error: prayerTimesError,
  } = usePrayerTimes(effectiveLocation?.latitude ?? null, effectiveLocation?.longitude ?? null);

  // Fetch device location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Use default location (Boston) if no permission
          setDeviceLocation({ latitude: 42.3601, longitude: -71.0589 });
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setDeviceLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        setDeviceLocation({ latitude: 42.3601, longitude: -71.0589 });
      }
    };

    getLocation();
  }, []);

  // Compute the center location based on filter
  const centerLocation = locationFilter.campusLocation ?? deviceLocation;

  // Fetch sessions when location or filter changes
  useEffect(() => {
    if (centerLocation) {
      fetchSessions({
        latitude: centerLocation.latitude,
        longitude: centerLocation.longitude,
        radiusMeters: locationFilter.radiusMeters,
      });
    }
  }, [centerLocation, locationFilter.radiusMeters, fetchSessions]);

  // Fetch attending sessions and subscribe to realtime
  useEffect(() => {
    if (user) {
      fetchAttendingSessions(user.id);
      subscribeToRealtime();
    }

    return () => {
      unsubscribeFromRealtime();
    };
  }, [user, fetchAttendingSessions, subscribeToRealtime, unsubscribeFromRealtime]);

  // Refetch when feed tab gains focus (e.g. returning from Create)
  useFocusEffect(
    useCallback(() => {
      if (centerLocation) {
        fetchSessions({
          latitude: centerLocation.latitude,
          longitude: centerLocation.longitude,
          radiusMeters: locationFilter.radiusMeters,
        });
      }
    }, [centerLocation, locationFilter.radiusMeters, fetchSessions])
  );

  const onRefresh = useCallback(async () => {
    if (!centerLocation) return;
    setRefreshing(true);
    await fetchSessions({
      latitude: centerLocation.latitude,
      longitude: centerLocation.longitude,
      radiusMeters: locationFilter.radiusMeters,
    });
    if (user) {
      await fetchAttendingSessions(user.id);
    }
    setRefreshing(false);
  }, [centerLocation, locationFilter.radiusMeters, user, fetchSessions, fetchAttendingSessions]);

  const handleJoin = async (sessionId: string) => {
    if (!user) return;
    await joinSession(sessionId, user.id);
  };

  const handleLeave = async (sessionId: string) => {
    if (!user) return;
    await leaveSession(sessionId, user.id);
  };

  const handleCancel = (session: SessionWithDetails) => {
    if (!user) return;

    Alert.alert(
      'Cancel Prayer Session',
      'Are you sure you want to cancel this prayer? All attendees will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelSession(session.session_id, user.id),
        },
      ]
    );
  };

  const handleFilterChange = (filter: LocationFilter) => {
    setLocationFilter(filter);
  };

  const getLocationLabel = () => {
    if (locationFilter.type === 'campus' && locationFilter.universityName) {
      return locationFilter.universityName;
    }
    const radiusOption = config.radiusOptions.find((r) => r.value === locationFilter.radiusMeters);
    return `Near me (${radiusOption?.label ?? '2 miles'})`;
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchMoreSessions();
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

      {/* Location selector (PRD 7.5) */}
      <Pressable
        className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100"
        onPress={() => setShowLocationFilter(true)}
      >
        <View className="flex-row items-center">
          <Text className="mr-2">📍</Text>
          <Text className="text-gray-900 font-medium">{getLocationLabel()}</Text>
        </View>
        <Text className="text-primary-500">Change ▼</Text>
      </Pressable>

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
      {isLoading && sessions.length === 0 ? (
        <FeedSkeleton />
      ) : sessions.length === 0 ? (
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
              onCancel={() => handleCancel(item)}
              onShowAttendees={() => setSelectedSessionForAttendees(item)}
            />
          )}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {/* Prayer Times Strip */}
              {prayerTimes && (
                <PrayerTimesStrip
                  prayerTimes={prayerTimes}
                  currentPrayer={currentPrayer}
                  isLoading={prayerTimesLoading}
                />
              )}
              {prayerTimesError && (
                <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <Text className="text-amber-700 text-sm">
                    {prayerTimesError}.{' '}
                    <Text
                      className="underline"
                      onPress={() => {
                        // Open support email
                        import('expo-linking').then((Linking) => {
                          Linking.openURL(`mailto:${config.supportEmail}`);
                        });
                      }}
                    >
                      Contact support
                    </Text>
                  </Text>
                </View>
              )}
              <Text className="text-lg font-semibold text-gray-900 mb-4">Upcoming Prayers</Text>
            </>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#28A745" />
              </View>
            ) : null
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

      {/* Location Filter Modal */}
      <LocationFilterModal
        visible={showLocationFilter}
        currentFilter={locationFilter}
        hasUniversity={!!profile?.university_id}
        universityName={profile?.university_id ? 'My Campus' : undefined}
        onSelectFilter={handleFilterChange}
        onClose={() => setShowLocationFilter(false)}
      />

      {/* Attendee List Modal */}
      {selectedSessionForAttendees && (
        <AttendeeListModal
          visible={!!selectedSessionForAttendees}
          sessionId={selectedSessionForAttendees.session_id}
          attendeeCount={selectedSessionForAttendees.attendee_count}
          onClose={() => setSelectedSessionForAttendees(null)}
        />
      )}
    </SafeAreaView>
  );
}
