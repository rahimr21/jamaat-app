// Map wrapper component with fallback for when maps can't load
import { config } from '@/constants';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

// Lazy load MapView to avoid crashes when maps unavailable
let MapViewComponent: React.ComponentType<
  React.ComponentProps<typeof import('react-native-maps').default>
> | null = null;
let MarkerComponent: React.ComponentType<
  React.ComponentProps<typeof import('react-native-maps').Marker>
> | null = null;

try {
  const Maps = require('react-native-maps');
  MapViewComponent = Maps.default;
  MarkerComponent = Maps.Marker;
} catch (error) {
  console.warn('react-native-maps not available:', error);
}

interface MapWrapperProps {
  children?: React.ReactNode;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: object;
  onRegionChange?: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  showsUserLocation?: boolean;
  fallbackMessage?: string;
}

// Check if Google Maps API key is configured
function isMapConfigured(): boolean {
  if (Platform.OS === 'android') {
    return !!config.googleMapsApiKeyAndroid;
  } else if (Platform.OS === 'ios') {
    // iOS uses Apple Maps by default, so no API key needed
    return true;
  }
  return false;
}

// Fallback component when maps aren't available
function MapFallback({ message }: { message: string }) {
  return (
    <View className="flex-1 bg-gray-100 items-center justify-center p-4 rounded-lg">
      <Text className="text-4xl mb-2">🗺️</Text>
      <Text className="text-gray-600 text-center">{message}</Text>
    </View>
  );
}

export function MapWrapper({
  children,
  initialRegion,
  style,
  onRegionChange,
  showsUserLocation = false,
  fallbackMessage = 'Map not available',
}: MapWrapperProps) {
  const [mapsAvailable, setMapsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if maps are available
    if (!MapViewComponent) {
      setMapsAvailable(false);
      setError('Map component not loaded');
      return;
    }

    if (Platform.OS === 'android' && !isMapConfigured()) {
      setMapsAvailable(false);
      setError('Google Maps API key not configured');
      return;
    }

    setMapsAvailable(true);
  }, []);

  // Loading state
  if (mapsAvailable === null) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#f3f4f6' }, style]}>
        <Text className="text-gray-500 text-center p-4">Loading map...</Text>
      </View>
    );
  }

  // Maps not available - show fallback
  if (!mapsAvailable || !MapViewComponent) {
    return (
      <View style={style}>
        <MapFallback message={error || fallbackMessage} />
      </View>
    );
  }

  // Render the actual map
  const MapView = MapViewComponent;

  return (
    <MapView
      style={[{ flex: 1 }, style]}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsUserLocation}
    >
      {children}
    </MapView>
  );
}

// Export Marker for use in map
export function MapMarker({
  coordinate,
  title,
  description,
  onPress,
}: {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  onPress?: () => void;
}) {
  if (!MarkerComponent) {
    return null;
  }

  const Marker = MarkerComponent;

  return (
    <Marker coordinate={coordinate} title={title} description={description} onPress={onPress} />
  );
}

// Hook to check if maps are available
export function useMapsAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (MapViewComponent && (Platform.OS !== 'android' || isMapConfigured())) {
      setAvailable(true);
    }
  }, []);

  return available;
}
