// Offline detection banner component
import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to detect network connectivity status
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Fetch initial state
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
  };
}

/**
 * Banner that shows when the app is offline
 */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const translateY = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    if (isOffline) {
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [isOffline, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        transform: [{ translateY }],
      }}
    >
      <View className="bg-amber-500 py-2 px-4">
        <Text className="text-white text-center text-sm font-medium">
          No internet connection. Some features may be unavailable.
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Compact offline indicator for use in headers
 */
export function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View className="flex-row items-center bg-amber-100 rounded-full px-2 py-1">
      <Text className="text-amber-700 text-xs">Offline</Text>
    </View>
  );
}
