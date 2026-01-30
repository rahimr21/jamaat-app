import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Check if running in Expo Go (where push notifications are not supported)
const isExpoGo = Constants.appOwnership === 'expo';

export default function PermissionsScreen() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();

  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if push notifications are available
  useEffect(() => {
    if (isExpoGo) {
      setNotificationsUnavailable(true);
    }
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Jamaat needs location access to find prayers near you. You can enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location:', error);
    }
  };

  const requestNotifications = async () => {
    // If in Expo Go, show a message instead of trying to enable
    if (isExpoGo) {
      Alert.alert(
        'Push Notifications',
        'Push notifications are not available in Expo Go. They will work in the production app.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const { registerForPushNotifications, savePushToken } =
        await import('@/lib/api/notifications');
      const token = await registerForPushNotifications();

      if (token) {
        setNotificationsGranted(true);

        if (user?.id) {
          await savePushToken(user.id, token);
        }
      } else {
        // Permission was denied
        Alert.alert('Notifications Disabled', 'You can enable notifications later in Settings.', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
      setNotificationsUnavailable(true);
      Alert.alert(
        'Notifications Unavailable',
        'Push notifications are not available on this device. You can still use the app without them.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await supabase.from('users').update({ onboarding_complete: true }).eq('id', user?.id);
      await fetchProfile();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error marking onboarding complete:', err);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        {/* Progress indicator */}
        <View className="flex-row mb-8">
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full" />
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">Enable permissions</Text>
        <Text className="text-gray-600 mb-8">These permissions help Jamaat work best for you</Text>

        {/* Location permission */}
        <View className="mb-6 p-4 bg-gray-50 rounded-xl">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-4">
              <Text className="text-2xl">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">Location</Text>
              <Text className="text-gray-600 text-sm mb-3">
                Find prayers near you and set prayer locations
              </Text>
              <Pressable
                className={`py-2 px-4 rounded-lg items-center ${locationGranted ? 'bg-green-100' : 'bg-primary-500 active:bg-primary-600'}`}
                onPress={requestLocation}
                disabled={locationGranted}
              >
                <Text
                  className={
                    locationGranted ? 'text-green-700 font-medium' : 'text-white font-medium'
                  }
                >
                  {locationGranted ? '✓ Enabled' : 'Enable Location'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Notification permission */}
        <View className="mb-8 p-4 bg-gray-50 rounded-xl">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-4">
              <Text className="text-2xl">🔔</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">Notifications</Text>
              <Text className="text-gray-600 text-sm mb-3">
                {notificationsUnavailable && isExpoGo
                  ? 'Push notifications are not available in Expo Go'
                  : 'Get notified about prayers near you and when others join'}
              </Text>
              {notificationsUnavailable ? (
                <View className="py-2 px-4 rounded-lg items-center bg-gray-200">
                  <Text className="text-gray-500 font-medium">
                    {isExpoGo ? 'Available in production' : 'Not available'}
                  </Text>
                </View>
              ) : (
                <Pressable
                  className={`py-2 px-4 rounded-lg items-center ${notificationsGranted ? 'bg-green-100' : 'bg-primary-500 active:bg-primary-600'}`}
                  onPress={requestNotifications}
                  disabled={notificationsGranted}
                >
                  <Text
                    className={
                      notificationsGranted ? 'text-green-700 font-medium' : 'text-white font-medium'
                    }
                  >
                    {notificationsGranted ? '✓ Enabled' : 'Enable Notifications'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Expo Go notice */}
        {isExpoGo && (
          <View className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <Text className="text-yellow-800 text-sm text-center">
              You're using Expo Go. Some features like push notifications will be available in the
              production app.
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View className="flex-1" />

        {/* Complete button */}
        <Pressable
          className={`w-full py-4 rounded-xl items-center mb-4 ${isLoading ? 'bg-gray-400' : 'bg-primary-500 active:bg-primary-600'}`}
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text className="text-white text-lg font-semibold">
            {isLoading ? 'Loading...' : 'Get Started'}
          </Text>
        </Pressable>

        <Text className="text-sm text-gray-500 text-center mb-4">
          You can change these settings anytime
        </Text>
      </View>
    </SafeAreaView>
  );
}
