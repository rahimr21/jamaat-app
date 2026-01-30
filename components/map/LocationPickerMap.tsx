// Location picker map component for fine-tuning current location
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapWrapper, MapMarker, useMapsAvailable } from './MapWrapper';

interface LocationPickerMapProps {
  initialLocation: { latitude: number; longitude: number };
  onLocationChange: (location: { latitude: number; longitude: number }) => void;
  style?: object;
}

export function LocationPickerMap({
  initialLocation,
  onLocationChange,
  style,
}: LocationPickerMapProps) {
  const mapsAvailable = useMapsAvailable();
  const [markerPosition, setMarkerPosition] = useState(initialLocation);

  const handleRegionChange = useCallback((region: { latitude: number; longitude: number }) => {
    setMarkerPosition({
      latitude: region.latitude,
      longitude: region.longitude,
    });
  }, []);

  const handleConfirm = () => {
    onLocationChange(markerPosition);
  };

  if (!mapsAvailable) {
    return (
      <View style={style} className="bg-gray-100 rounded-lg p-4 items-center justify-center">
        <Text className="text-4xl mb-2">📍</Text>
        <Text className="text-gray-600 text-center">
          Map picker not available. Using your current GPS location.
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapWrapper
        initialRegion={{
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChange={handleRegionChange}
        showsUserLocation
        style={{ flex: 1, borderRadius: 12 }}
      >
        <MapMarker
          coordinate={markerPosition}
          title="Prayer Location"
          description="Drag the map to adjust"
        />
      </MapWrapper>

      {/* Crosshair in center */}
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="w-8 h-8 items-center justify-center">
          <View className="w-4 h-0.5 bg-primary-500" />
          <View className="absolute w-0.5 h-4 bg-primary-500" />
        </View>
      </View>

      {/* Confirm button */}
      <View className="absolute bottom-4 left-4 right-4">
        <Pressable className="bg-primary-500 py-3 rounded-lg items-center" onPress={handleConfirm}>
          <Text className="text-white font-semibold">Confirm Location</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Preview map showing a static location
interface LocationPreviewProps {
  location: { latitude: number; longitude: number };
  style?: object;
}

export function LocationPreview({ location, style }: LocationPreviewProps) {
  const mapsAvailable = useMapsAvailable();

  if (!mapsAvailable) {
    return (
      <View style={style} className="bg-gray-100 rounded-lg p-3">
        <Text className="text-gray-600 text-sm">
          📍 Location selected ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ height: 150 }, style]}>
      <MapWrapper
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        style={{ flex: 1, borderRadius: 8 }}
      >
        <MapMarker coordinate={location} title="Prayer Location" />
      </MapWrapper>
    </View>
  );
}
