import { useState } from 'react';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function PermissionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(status === 'granted');

      if (status === 'granted') {
        // Get and save push token
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        
        await supabase
          .from('users')
          .update({ expo_push_token: token })
          .eq('id', user?.id);
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    // Auth state will redirect to (tabs) automatically
    router.replace('/(tabs)');
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
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Enable permissions
        </Text>
        <Text className="text-gray-600 mb-8">
          These permissions help Jamaat work best for you
        </Text>

        {/* Location permission */}
        <View className="mb-6 p-4 bg-gray-50 rounded-xl">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-4">
              <Text className="text-2xl">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                Location
              </Text>
              <Text className="text-gray-600 text-sm mb-3">
                Find prayers near you and set prayer locations
              </Text>
              <Pressable
                className={`py-2 px-4 rounded-lg items-center ${locationGranted ? 'bg-green-100' : 'bg-primary-500 active:bg-primary-600'}`}
                onPress={requestLocation}
                disabled={locationGranted}
              >
                <Text className={locationGranted ? 'text-green-700 font-medium' : 'text-white font-medium'}>
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
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                Notifications
              </Text>
              <Text className="text-gray-600 text-sm mb-3">
                Get notified about prayers near you and when others join
              </Text>
              <Pressable
                className={`py-2 px-4 rounded-lg items-center ${notificationsGranted ? 'bg-green-100' : 'bg-primary-500 active:bg-primary-600'}`}
                onPress={requestNotifications}
                disabled={notificationsGranted}
              >
                <Text className={notificationsGranted ? 'text-green-700 font-medium' : 'text-white font-medium'}>
                  {notificationsGranted ? '✓ Enabled' : 'Enable Notifications'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

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
