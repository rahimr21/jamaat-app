import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/constants';
import type { University } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UNIVERSITIES_CACHE_KEY = 'universities_list';

interface CachedUniversities {
  data: University[];
  cachedAt: number;
}

// Check if cache is still valid (within TTL)
function isCacheValid(cachedAt: number): boolean {
  const now = Date.now();
  return now - cachedAt < config.universitiesCacheTTL;
}

// Get cached universities
async function getCachedUniversities(): Promise<University[] | null> {
  try {
    const cached = await AsyncStorage.getItem(UNIVERSITIES_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedUniversities = JSON.parse(cached);
    if (!isCacheValid(parsed.cachedAt)) {
      await AsyncStorage.removeItem(UNIVERSITIES_CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

// Save universities to cache
async function cacheUniversities(data: University[]): Promise<void> {
  try {
    const cacheData: CachedUniversities = {
      data,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(UNIVERSITIES_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching universities:', error);
  }
}

export default function UniversityScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromSettings = from === 'settings';
  const { user, profile, fetchProfile } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch universities on mount with caching
  useEffect(() => {
    const fetchUniversities = async () => {
      // Try cache first
      const cached = await getCachedUniversities();
      if (cached && cached.length > 0) {
        setUniversities(cached);
        setFilteredUniversities(cached);

        // Pre-select current university when editing from settings
        if (profile?.university_id && fromSettings) {
          const current = cached.find((u) => u.id === profile.university_id);
          if (current) setSelectedUniversity(current);
        }

        setIsLoading(false);

        // Refresh in background (stale-while-revalidate pattern)
        refreshUniversitiesInBackground();
        return;
      }

      // No cache, fetch from server
      await fetchFromServer();
    };

    const fetchFromServer = async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        const list = data as University[];
        setUniversities(list);
        setFilteredUniversities(list);

        // Cache the results
        await cacheUniversities(list);

        // Pre-select current university when editing from settings
        if (profile?.university_id && fromSettings) {
          const current = list.find((u) => u.id === profile.university_id);
          if (current) setSelectedUniversity(current);
        }
      }
      setIsLoading(false);
    };

    const refreshUniversitiesInBackground = async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        const list = data as University[];
        setUniversities(list);
        setFilteredUniversities(list);
        await cacheUniversities(list);
      }
    };

    fetchUniversities();
  }, [fromSettings, profile?.university_id]);

  // Filter universities based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = universities.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUniversities(filtered);
    } else {
      setFilteredUniversities(universities);
    }
  }, [searchQuery, universities]);

  const handleContinue = async () => {
    if (!selectedUniversity) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_student: true,
          university_id: selectedUniversity.id,
        })
        .eq('id', user?.id);

      if (error) throw error;

      await fetchProfile();
      if (fromSettings) {
        router.back();
      } else {
        router.push('/(auth)/permissions');
      }
    } catch (err) {
      console.error('Error saving university:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (fromSettings) {
      router.back();
    } else {
      router.push('/(auth)/permissions');
    }
  };

  const handleRemoveUniversity = async () => {
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_student: false, university_id: null })
        .eq('id', user?.id);

      if (error) throw error;
      await fetchProfile();
      if (fromSettings) {
        router.back();
      } else {
        router.push('/(auth)/permissions');
      }
    } catch (err) {
      console.error('Error removing university:', err);
    } finally {
      setIsRemoving(false);
    }
  };

  const renderUniversity = ({ item }: { item: University }) => (
    <Pressable
      className={`py-4 px-4 border-b border-gray-100 ${selectedUniversity?.id === item.id ? 'bg-primary-50' : ''}`}
      onPress={() => setSelectedUniversity(item)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900">{item.name}</Text>
          {item.city && item.state && (
            <Text className="text-sm text-gray-500">
              {item.city}, {item.state}
            </Text>
          )}
        </View>
        {selectedUniversity?.id === item.id && (
          <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
            <Text className="text-white text-sm">✓</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        {/* Progress indicator */}
        <View className="flex-row mb-8">
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-gray-200 rounded-full" />
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">Select your university</Text>
        <Text className="text-gray-600 mb-6">
          Find prayer spaces and connect with students at your campus
        </Text>

        {/* Search */}
        <View className="mb-4">
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="Search universities..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* University list */}
        <View className="flex-1 border border-gray-200 rounded-lg mb-4">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Loading universities...</Text>
            </View>
          ) : filteredUniversities.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-gray-500 text-center">
                No universities found.{'\n'}Try a different search term.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUniversities}
              renderItem={renderUniversity}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Remove university (when user has one, e.g. from settings) */}
        {(profile?.university_id || profile?.is_student) && (
          <Pressable
            className="w-full py-3 rounded-xl items-center mb-3 border border-red-200 bg-red-50 active:bg-red-100"
            onPress={handleRemoveUniversity}
            disabled={isRemoving}
          >
            <Text className="text-red-600 font-medium">
              {isRemoving ? 'Removing...' : "I'm not a student / Remove university"}
            </Text>
          </Pressable>
        )}

        {/* Continue button */}
        <Pressable
          className={`w-full py-4 rounded-xl items-center mb-3 ${isSaving || !selectedUniversity ? 'bg-gray-400' : 'bg-primary-500 active:bg-primary-600'}`}
          onPress={handleContinue}
          disabled={isSaving || !selectedUniversity}
        >
          <Text className="text-white text-lg font-semibold">
            {isSaving ? 'Saving...' : fromSettings ? 'Save' : 'Continue'}
          </Text>
        </Pressable>

        {/* Skip / Back */}
        <Pressable onPress={handleSkip} className="items-center py-2">
          <Text className="text-gray-500">{fromSettings ? 'Back' : 'Skip for now'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
