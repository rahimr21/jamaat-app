import '@/global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { OfflineBanner, Toast } from '@/components/common';
import { useColorScheme } from '@/components/useColorScheme';
import { cleanupOfflineQueue, initOfflineQueue } from '@/lib/offlineQueue';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Handles deep link (email confirmation / magic link). No navigation hooks so safe outside Stack.
function DeepLinkHandler() {
  useEffect(() => {
    const handleUrl = (url: string) => {
      if (url.startsWith('jamaat://auth/callback')) {
        useAuthStore.getState().setSessionFromUrl(url);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthInit />
      <DeepLinkHandler />
      <ToastProvider />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

// Initialize auth state and offline queue on mount. No navigation hooks.
function AuthInit() {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => {
    initialize();
    initOfflineQueue();

    return () => {
      cleanupOfflineQueue();
    };
  }, [initialize]);
  return null;
}

// Global toast notifications
function ToastProvider() {
  const { visible, message, type, hideToast } = useToastStore();
  return <Toast visible={visible} message={message} type={type} onHide={hideToast} />;
}
