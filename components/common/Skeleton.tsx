// Skeleton loading components for loading states
import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton loading placeholder
 */
export function Skeleton({ 
  width = '100%', 
  height = 16, 
  borderRadius = 4,
  style 
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for session cards in the feed
 */
export function SessionCardSkeleton() {
  return (
    <View className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="ml-3 flex-1">
          <Skeleton width={80} height={18} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={14} />
        </View>
      </View>

      {/* Location */}
      <View className="flex-row items-center mb-2">
        <Skeleton width={16} height={16} borderRadius={8} />
        <Skeleton width={150} height={14} style={{ marginLeft: 8 }} />
        <View className="flex-1" />
        <Skeleton width={40} height={14} />
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

/**
 * Skeleton for the feed list
 */
export function FeedSkeleton() {
  return (
    <View className="p-4">
      {/* Prayer times strip skeleton */}
      <View className="bg-gray-50 rounded-xl p-3 mb-4">
        <View className="flex-row justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="items-center px-2">
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={40} height={12} style={{ marginTop: 4, marginBottom: 2 }} />
              <Skeleton width={48} height={14} />
            </View>
          ))}
        </View>
      </View>

      {/* Section header */}
      <Skeleton width={120} height={20} style={{ marginBottom: 16 }} />

      {/* Session cards */}
      <SessionCardSkeleton />
      <SessionCardSkeleton />
      <SessionCardSkeleton />
    </View>
  );
}

/**
 * Skeleton for university list items
 */
export function UniversityItemSkeleton() {
  return (
    <View className="flex-row items-center py-3 px-4 border-b border-gray-100">
      <View className="flex-1">
        <Skeleton width={180} height={16} style={{ marginBottom: 4 }} />
        <Skeleton width={120} height={12} />
      </View>
    </View>
  );
}

/**
 * Skeleton for prayer space list items
 */
export function PrayerSpaceItemSkeleton() {
  return (
    <View className="py-3 px-3 mb-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Skeleton width={150} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={200} height={12} />
        </View>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <View className="flex-1 bg-white p-6">
      <Skeleton width={200} height={28} style={{ marginBottom: 8 }} />
      <Skeleton width={280} height={16} style={{ marginBottom: 24 }} />
      
      <Skeleton height={100} style={{ marginBottom: 16 }} borderRadius={12} />
      <Skeleton height={100} style={{ marginBottom: 16 }} borderRadius={12} />
      <Skeleton height={100} borderRadius={12} />
    </View>
  );
}
