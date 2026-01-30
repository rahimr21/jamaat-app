import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isInitialized, profile } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (!session) return;
    if (profile) {
      router.replace('/(tabs)');
      return;
    }
    if (segments[1] !== 'profile') {
      router.replace('/(auth)/profile');
    }
  }, [session, profile, isInitialized, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="student" />
      <Stack.Screen name="university" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}
