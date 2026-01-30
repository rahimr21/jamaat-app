// Toast notification component
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const TOAST_COLORS = {
  success: {
    bg: 'bg-green-500',
    text: 'text-white',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-500',
    text: 'text-white',
    icon: '✕',
  },
  warning: {
    bg: 'bg-amber-500',
    text: 'text-white',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-500',
    text: 'text-white',
    icon: 'ℹ',
  },
};

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const colors = TOAST_COLORS[type];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable
        className={`flex-row items-center px-4 py-3 rounded-xl shadow-lg ${colors.bg}`}
        onPress={hideToast}
      >
        <Text className={`text-lg mr-2 ${colors.text}`}>{colors.icon}</Text>
        <Text className={`flex-1 ${colors.text} font-medium`} numberOfLines={2}>
          {message}
        </Text>
        <Text className={`${colors.text} ml-2 opacity-70`}>×</Text>
      </Pressable>
    </Animated.View>
  );
}
