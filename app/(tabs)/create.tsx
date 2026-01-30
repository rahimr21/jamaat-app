import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import type { PrayerType, PrayerSpace } from '@/types';

const prayerTypes: { type: PrayerType; label: string; icon: string }[] = [
  { type: 'fajr', label: 'Fajr', icon: '🌅' },
  { type: 'dhuhr', label: 'Dhuhr', icon: '☀️' },
  { type: 'asr', label: 'Asr', icon: '🌤️' },
  { type: 'maghrib', label: 'Maghrib', icon: '🌆' },
  { type: 'isha', label: 'Isha', icon: '🌙' },
  { type: 'jummah', label: 'Jummah', icon: '🕌' },
];

type LocationType = 'campus' | 'current';

export default function CreateScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { createSession } = useSessionStore();

  // Form state
  const [prayerType, setPrayerType] = useState<PrayerType>('dhuhr');
  const [locationType, setLocationType] = useState<LocationType>('campus');
  const [selectedSpace, setSelectedSpace] = useState<PrayerSpace | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Data state
  const [prayerSpaces, setPrayerSpaces] = useState<PrayerSpace[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch prayer spaces for user's university
  useEffect(() => {
    const fetchSpaces = async () => {
      if (!profile?.university_id) {
        setIsLoadingSpaces(false);
        return;
      }

      const { data, error } = await supabase
        .from('prayer_spaces')
        .select('*')
        .eq('university_id', profile.university_id)
        .eq('is_verified', true)
        .order('name');

      if (!error && data) {
        setPrayerSpaces(data as PrayerSpace[]);
        if (data.length > 0) {
          setSelectedSpace(data[0] as PrayerSpace);
        }
      }
      setIsLoadingSpaces(false);
    };

    fetchSpaces();
  }, [profile?.university_id]);

  // Get current location when selecting "current location"
  useEffect(() => {
    if (locationType === 'current') {
      const getLocation = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            setError('Location permission required');
            return;
          }

          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (err) {
          setError('Could not get your location');
        }
      };

      getLocation();
    }
  }, [locationType]);

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (locationType === 'campus' && !selectedSpace) {
      setError('Please select a prayer space');
      return;
    }

    if (locationType === 'current' && !currentLocation) {
      setError('Could not get your location');
      return;
    }

    if (scheduledDate <= new Date()) {
      setError('Please select a future time');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: createError } = await createSession({
        prayerType,
        prayerSpaceId: locationType === 'campus' ? selectedSpace?.id : undefined,
        customLocation: locationType === 'current' ? currentLocation! : undefined,
        customLocationName: locationType === 'current' ? customLocationName : undefined,
        scheduledTime: scheduledDate,
        notes: notes.trim() || undefined,
        createdBy: user!.id,
      });

      if (createError) throw createError;

      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (event: unknown, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setScheduledDate(newDate);
    }
  };

  const handleTimeChange = (event: unknown, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setScheduledDate(newDate);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4">
            <Text className="text-primary-500 text-lg">← Back</Text>
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Create Prayer Session</Text>
        </View>

        {/* Prayer Type */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-3">Prayer Type</Text>
          <View className="flex-row flex-wrap">
            {prayerTypes.map(({ type, label, icon }) => (
              <Pressable
                key={type}
                className={`mr-2 mb-2 px-4 py-2 rounded-full flex-row items-center ${
                  prayerType === type ? 'bg-primary-500' : 'bg-gray-100'
                }`}
                onPress={() => setPrayerType(type)}
              >
                <Text className="mr-1">{icon}</Text>
                <Text className={prayerType === type ? 'text-white font-medium' : 'text-gray-700'}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Location Type */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-3">Location</Text>
          
          <View className="flex-row mb-4">
            <Pressable
              className={`flex-1 py-3 rounded-l-lg border ${
                locationType === 'campus' 
                  ? 'bg-primary-500 border-primary-500' 
                  : 'bg-white border-gray-300'
              }`}
              onPress={() => setLocationType('campus')}
            >
              <Text className={`text-center font-medium ${
                locationType === 'campus' ? 'text-white' : 'text-gray-700'
              }`}>
                Campus Space
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-r-lg border-t border-r border-b ${
                locationType === 'current' 
                  ? 'bg-primary-500 border-primary-500' 
                  : 'bg-white border-gray-300'
              }`}
              onPress={() => setLocationType('current')}
            >
              <Text className={`text-center font-medium ${
                locationType === 'current' ? 'text-white' : 'text-gray-700'
              }`}>
                Current Location
              </Text>
            </Pressable>
          </View>

          {locationType === 'campus' && (
            <View className="bg-gray-50 rounded-lg p-3">
              {isLoadingSpaces ? (
                <Text className="text-gray-500">Loading spaces...</Text>
              ) : prayerSpaces.length === 0 ? (
                <Text className="text-gray-500">No prayer spaces available</Text>
              ) : (
                prayerSpaces.map((space) => (
                  <Pressable
                    key={space.id}
                    className={`py-3 px-3 rounded-lg mb-1 ${
                      selectedSpace?.id === space.id ? 'bg-primary-100' : ''
                    }`}
                    onPress={() => setSelectedSpace(space)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="font-medium text-gray-900">{space.name}</Text>
                        {space.description && (
                          <Text className="text-sm text-gray-500" numberOfLines={1}>
                            {space.description}
                          </Text>
                        )}
                      </View>
                      {selectedSpace?.id === space.id && (
                        <Text className="text-primary-500">✓</Text>
                      )}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {locationType === 'current' && (
            <View className="bg-gray-50 rounded-lg p-4">
              {currentLocation ? (
                <>
                  <Text className="text-gray-600 mb-2">📍 Using your current location</Text>
                  <Input
                    label="Location name (optional)"
                    placeholder="e.g., Near Starbucks"
                    value={customLocationName}
                    onChangeText={setCustomLocationName}
                  />
                </>
              ) : (
                <Text className="text-gray-500">Getting your location...</Text>
              )}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-3">Date & Time</Text>
          <View className="flex-row">
            <Pressable
              className="flex-1 mr-2 py-3 px-4 bg-gray-50 rounded-lg"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-gray-500 text-sm">Date</Text>
              <Text className="text-gray-900 font-medium">
                {scheduledDate.toLocaleDateString()}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 px-4 bg-gray-50 rounded-lg"
              onPress={() => setShowTimePicker(true)}
            >
              <Text className="text-gray-500 text-sm">Time</Text>
              <Text className="text-gray-900 font-medium">
                {scheduledDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </Pressable>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Notes */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Notes (optional)</Text>
          <TextInput
            className="bg-gray-50 rounded-lg p-4 text-gray-900 min-h-[100px]"
            placeholder="e.g., Bring prayer rug"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text className="text-right text-sm text-gray-400 mt-1">
            {notes.length}/500
          </Text>
        </View>

        {/* Error */}
        {error && (
          <Text className="text-red-500 text-sm mb-4">{error}</Text>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={handleSubmit}
        >
          Create Session
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
