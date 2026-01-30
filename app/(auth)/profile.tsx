import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!displayName || displayName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (displayName.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: user?.id,
            email: user?.email,
            phone: user?.phone,
            display_name: displayName.trim(),
          },
          { onConflict: 'id' }
        );

      if (upsertError) throw upsertError;

      await fetchProfile();
      router.push('/(auth)/student');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          {/* Progress indicator */}
          <View className="flex-row mb-8">
            <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
            <View className="flex-1 h-1 bg-gray-200 rounded-full mr-1" />
            <View className="flex-1 h-1 bg-gray-200 rounded-full mr-1" />
            <View className="flex-1 h-1 bg-gray-200 rounded-full" />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            What's your name?
          </Text>
          <Text className="text-gray-600 mb-8">
            This is how other users will see you
          </Text>

          {/* Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Display name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              autoFocus
            />
          </View>

          {/* Error message */}
          {error && (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          )}

          {/* Continue button */}
          <Pressable
            className={`w-full py-4 rounded-xl items-center ${isLoading || displayName.length < 2 ? 'bg-gray-400' : 'bg-primary-500 active:bg-primary-600'}`}
            onPress={handleContinue}
            disabled={isLoading || displayName.length < 2}
          >
            <Text className="text-white text-lg font-semibold">
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
