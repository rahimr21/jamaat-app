import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

export default function VerifyScreen() {
  const router = useRouter();
  const { type, value } = useLocalSearchParams<{ type: 'email' | 'phone'; value: string }>();
  const { verifyOtp, session } = useAuthStore();
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // If session is set (from magic link), redirect to profile
  useEffect(() => {
    if (session) {
      router.replace('/(auth)/profile');
    }
  }, [session, router]);

  const handleVerify = async () => {
    if (type === 'email') {
      // For email, the magic link will handle auth automatically
      // Just show a message to check email
      return;
    }

    if (!otp || otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error } = await verifyOtp(value!, otp);
      if (error) throw error;
      // Auth state change will redirect to profile
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (type === 'email') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          {/* Email icon */}
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-6">
            <Text className="text-4xl">✉️</Text>
          </View>

          <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
            Check your email
          </Text>

          <Text className="text-gray-600 text-center mb-8">
            We sent a magic link to{'\n'}
            <Text className="font-semibold text-gray-900">{value}</Text>
          </Text>

          <Text className="text-sm text-gray-500 text-center">
            Click the link in the email to sign in.{'\n'}
            The link will expire in 1 hour.
          </Text>

          <Pressable 
            onPress={() => router.back()} 
            className="mt-8"
          >
            <Text className="text-primary-500 font-medium">
              ← Use a different email
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="mb-8">
          <Text className="text-primary-500 text-lg">← Back</Text>
        </Pressable>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Enter verification code
        </Text>
        <Text className="text-gray-600 mb-8">
          We sent a 6-digit code to{'\n'}
          <Text className="font-semibold text-gray-900">{value}</Text>
        </Text>

        {/* OTP Input */}
        <View className="mb-4">
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-4 text-xl text-center text-gray-900 tracking-widest"
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        {/* Error message */}
        {error && (
          <Text className="text-red-500 text-sm mb-4">{error}</Text>
        )}

        {/* Verify button */}
        <Pressable
          className={`w-full py-4 rounded-xl items-center ${isLoading || otp.length !== 6 ? 'bg-gray-400' : 'bg-primary-500 active:bg-primary-600'}`}
          onPress={handleVerify}
          disabled={isLoading || otp.length !== 6}
        >
          <Text className="text-white text-lg font-semibold">
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </Pressable>

        {/* Resend code */}
        <View className="mt-6 items-center">
          {countdown > 0 ? (
            <Text className="text-gray-500">
              Resend code in {countdown}s
            </Text>
          ) : (
            <Pressable onPress={() => setCountdown(60)}>
              <Text className="text-primary-500 font-medium">
                Resend code
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
