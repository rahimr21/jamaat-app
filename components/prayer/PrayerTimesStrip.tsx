// Prayer times horizontal strip component for feed header
import { formatPrayerTime } from '@/lib/api/aladhan';
import type { PrayerTimes, PrayerType } from '@/types';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface PrayerTimesStripProps {
  prayerTimes: PrayerTimes;
  currentPrayer: PrayerType | null;
  onPrayerPress?: (prayerType: PrayerType) => void;
  isLoading?: boolean;
}

const PRAYERS: { type: PrayerType; label: string; icon: string }[] = [
  { type: 'fajr', label: 'Fajr', icon: '🌅' },
  { type: 'dhuhr', label: 'Dhuhr', icon: '☀️' },
  { type: 'asr', label: 'Asr', icon: '🌤️' },
  { type: 'maghrib', label: 'Maghrib', icon: '🌆' },
  { type: 'isha', label: 'Isha', icon: '🌙' },
];

export function PrayerTimesStrip({
  prayerTimes,
  currentPrayer,
  onPrayerPress,
  isLoading,
}: PrayerTimesStripProps) {
  if (isLoading) {
    return (
      <View className="bg-gray-50 rounded-xl p-3 mb-4">
        <View className="flex-row justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="items-center px-2">
              <View className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mb-1" />
              <View className="w-10 h-3 bg-gray-200 rounded animate-pulse mb-1" />
              <View className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-xl p-3 mb-4">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
      >
        {PRAYERS.map(({ type, label, icon }) => {
          const isActive = currentPrayer === type;
          const timeStr = prayerTimes[type as keyof Omit<PrayerTimes, 'date'>];
          
          return (
            <Pressable
              key={type}
              className={`items-center px-3 py-2 rounded-lg min-w-[60px] ${
                isActive ? 'bg-primary-500' : ''
              }`}
              onPress={() => onPrayerPress?.(type)}
            >
              <Text className="text-lg mb-0.5">{icon}</Text>
              <Text
                className={`text-xs font-medium uppercase ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                {label}
              </Text>
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-white' : 'text-gray-900'
                }`}
              >
                {typeof timeStr === 'string' ? formatPrayerTime(timeStr) : '--:--'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Compact version for smaller spaces
export function PrayerTimesCompact({
  prayerTimes,
  nextPrayer,
}: {
  prayerTimes: PrayerTimes;
  nextPrayer: { type: PrayerType; timeUntil: string } | null;
}) {
  if (!nextPrayer) return null;

  const prayerLabels: Record<PrayerType, string> = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    jummah: 'Jummah',
  };

  const timeStr = prayerTimes[nextPrayer.type as keyof Omit<PrayerTimes, 'date'>];

  return (
    <View className="flex-row items-center bg-primary-50 rounded-lg px-3 py-2">
      <Text className="text-primary-700 text-sm">
        Next: <Text className="font-semibold">{prayerLabels[nextPrayer.type]}</Text>
        {typeof timeStr === 'string' && (
          <Text> at {formatPrayerTime(timeStr)}</Text>
        )}
        <Text className="text-primary-500"> ({nextPrayer.timeUntil})</Text>
      </Text>
    </View>
  );
}
