// Map view for displaying prayer sessions
import { formatTime } from '@/lib/utils/date';
import type { SessionWithDetails, PrayerType } from '@/types';
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapWrapper, MapMarker, useMapsAvailable } from './MapWrapper';

// Prayer icons for markers
const prayerIcons: Record<PrayerType, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌆',
  isha: '🌙',
  jummah: '🕌',
};

interface SessionMapViewProps {
  sessions: SessionWithDetails[];
  userLocation: { latitude: number; longitude: number };
  onSessionPress?: (session: SessionWithDetails) => void;
  style?: object;
}

export function SessionMapView({
  sessions,
  userLocation,
  onSessionPress,
  style,
}: SessionMapViewProps) {
  const mapsAvailable = useMapsAvailable();

  // Calculate initial region to fit all sessions
  const getInitialRegion = () => {
    if (sessions.length === 0) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Find bounds
    let minLat = userLocation.latitude;
    let maxLat = userLocation.latitude;
    let minLng = userLocation.longitude;
    let maxLng = userLocation.longitude;

    sessions.forEach((session) => {
      minLat = Math.min(minLat, session.location_lat);
      maxLat = Math.max(maxLat, session.location_lat);
      minLng = Math.min(minLng, session.location_lng);
      maxLng = Math.max(maxLng, session.location_lng);
    });

    const latDelta = Math.max(0.01, (maxLat - minLat) * 1.5);
    const lngDelta = Math.max(0.01, (maxLng - minLng) * 1.5);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  if (!mapsAvailable) {
    return (
      <View style={style} className="bg-gray-100 rounded-lg p-4 items-center justify-center">
        <Text className="text-4xl mb-2">🗺️</Text>
        <Text className="text-gray-600 text-center">
          Map view not available. Use list view to see prayers.
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapWrapper
        initialRegion={getInitialRegion()}
        showsUserLocation
        style={{ flex: 1, borderRadius: 12 }}
      >
        {sessions.map((session) => (
          <MapMarker
            key={session.session_id}
            coordinate={{
              latitude: session.location_lat,
              longitude: session.location_lng,
            }}
            title={`${prayerIcons[session.prayer_type as PrayerType]} ${session.prayer_type}`}
            description={`${formatTime(session.scheduled_time)} · ${session.attendee_count} attending`}
            onPress={() => onSessionPress?.(session)}
          />
        ))}
      </MapWrapper>
    </View>
  );
}

// Component to toggle between list and map view
interface ViewToggleProps {
  currentView: 'list' | 'map';
  onToggle: (view: 'list' | 'map') => void;
}

export function ViewToggle({ currentView, onToggle }: ViewToggleProps) {
  const mapsAvailable = useMapsAvailable();

  if (!mapsAvailable) {
    return null; // Don't show toggle if maps aren't available
  }

  return (
    <View className="flex-row bg-gray-100 rounded-lg p-1">
      <Pressable
        className={`flex-1 py-2 rounded-md ${currentView === 'list' ? 'bg-white' : ''}`}
        onPress={() => onToggle('list')}
      >
        <Text
          className={`text-center font-medium ${currentView === 'list' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          List
        </Text>
      </Pressable>
      <Pressable
        className={`flex-1 py-2 rounded-md ${currentView === 'map' ? 'bg-white' : ''}`}
        onPress={() => onToggle('map')}
      >
        <Text
          className={`text-center font-medium ${currentView === 'map' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          Map
        </Text>
      </Pressable>
    </View>
  );
}
