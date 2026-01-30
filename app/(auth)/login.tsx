import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

type AuthMethod = 'email' | 'phone';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithPhone } = useAuthStore();
  
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (authMethod === 'email') {
        if (!email || !email.includes('@')) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }
        const { error } = await signInWithEmail(email);
        if (error) throw error;
        router.push({ pathname: '/(auth)/verify', params: { type: 'email', value: email } });
      } else {
        if (!phone || phone.length < 10) {
          setError('Please enter a valid phone number');
          setIsLoading(false);
          return;
        }
        const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
        const { error } = await signInWithPhone(formattedPhone);
        if (error) throw error;
        router.push({ pathname: '/(auth)/verify', params: { type: 'phone', value: formattedPhone } });
      }
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
          {/* Back button */}
          <Pressable onPress={() => router.back()} className="mb-8">
            <Text className="text-primary-500 text-lg">← Back</Text>
          </Pressable>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to Jamaat
          </Text>
          <Text className="text-gray-600 mb-8">
            Choose how you'd like to sign in
          </Text>

          {/* Auth method toggle */}
          <View className="flex-row mb-6 bg-gray-100 rounded-lg p-1">
            <Pressable
              className={`flex-1 py-3 rounded-md ${authMethod === 'email' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setAuthMethod('email')}
            >
              <Text className={`text-center font-medium ${authMethod === 'email' ? 'text-gray-900' : 'text-gray-500'}`}>
                Email
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-md ${authMethod === 'phone' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setAuthMethod('phone')}
            >
              <Text className={`text-center font-medium ${authMethod === 'phone' ? 'text-gray-900' : 'text-gray-500'}`}>
                Phone
              </Text>
            </Pressable>
          </View>

          {/* Input */}
          {authMethod === 'email' ? (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Email address</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Phone number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
          )}

          {/* Error message */}
          {error && (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          )}

          {/* Continue button */}
          <Pressable
            className={`w-full py-4 rounded-xl items-center ${isLoading ? 'bg-gray-400' : 'bg-primary-500 active:bg-primary-600'}`}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text className="text-white text-lg font-semibold">
              {isLoading ? 'Sending...' : 'Continue'}
            </Text>
          </Pressable>

          <Text className="text-sm text-gray-500 mt-4 text-center">
            {authMethod === 'email' 
              ? "We'll send you a magic link to sign in"
              : "We'll send you a verification code"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
