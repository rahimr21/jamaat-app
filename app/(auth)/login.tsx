import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

type AuthMethod = 'email' | 'phone';
type AuthMode = 'sign-in' | 'sign-up';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithPassword, signUpWithEmail, signInWithPhone } = useAuthStore();
  
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return email && email.includes('@') && email.includes('.');
  };

  const validatePassword = (password: string) => {
    return password && password.length >= 6;
  };

  const handleContinue = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (authMethod === 'email') {
        // Validate email
        if (!validateEmail(email)) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        // Validate password
        if (!validatePassword(password)) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        // Validate confirm password for sign-up
        if (authMode === 'sign-up' && password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (authMode === 'sign-in') {
          // Sign in with email + password (works without email confirmation)
          const { error } = await signInWithPassword(email, password);
          if (error) throw error;
          // Auth state change will redirect via (auth)/_layout
        } else {
          // Sign up with email + password (if "Confirm email" is off in Supabase, redirects to profile)
          const { error } = await signUpWithEmail(email, password);
          if (error) throw error;
          // Auth state change will redirect to profile; if confirmation required, user must click email link
        }
      } else {
        // Phone auth (OTP) - works for both sign-in and sign-up
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

  const handleMagicLink = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email);
      if (error) throw error;
      router.push({ pathname: '/(auth)/verify', params: { type: 'email', value: email } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in');
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Back button */}
            <Pressable onPress={() => router.back()} className="mb-8">
              <Text className="text-primary-500 text-lg">← Back</Text>
            </Pressable>

            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {authMode === 'sign-in' ? 'Sign in to Jamaat' : 'Create your account'}
            </Text>
            <Text className="text-gray-600 mb-8">
              {authMode === 'sign-in' 
                ? 'Welcome back! Sign in to continue'
                : 'Join Jamaat to find prayers near you'}
            </Text>

            {/* Auth method toggle (Email / Phone) */}
            <View className="flex-row mb-6 bg-gray-100 rounded-lg p-1">
              <Pressable
                className={`flex-1 py-3 rounded-md ${authMethod === 'email' ? 'bg-white border border-gray-200' : ''}`}
                onPress={() => setAuthMethod('email')}
              >
                <Text className={`text-center font-medium ${authMethod === 'email' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Email
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 py-3 rounded-md ${authMethod === 'phone' ? 'bg-white border border-gray-200' : ''}`}
                onPress={() => setAuthMethod('phone')}
              >
                <Text className={`text-center font-medium ${authMethod === 'phone' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Phone
                </Text>
              </Pressable>
            </View>

            {/* Input fields */}
            {authMethod === 'email' ? (
              <View>
                {/* Email input */}
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

                {/* Password input */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={authMode === 'sign-in' ? 'password' : 'new-password'}
                  />
                </View>

                {/* Confirm password input (sign-up only) */}
                {authMode === 'sign-up' && (
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Confirm password</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                      placeholder="Confirm your password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                  </View>
                )}
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
                {isLoading 
                  ? (authMode === 'sign-in' ? 'Signing in...' : 'Creating account...') 
                  : (authMode === 'sign-in' ? 'Sign In' : 'Sign Up')}
              </Text>
            </Pressable>

            {/* Magic link option for email sign-in */}
            {authMethod === 'email' && authMode === 'sign-in' && (
              <Pressable onPress={handleMagicLink} className="mt-4" disabled={isLoading}>
                <Text className="text-primary-500 text-center text-sm">
                  Sign in with magic link instead
                </Text>
              </Pressable>
            )}

            {/* Helper text for phone */}
            {authMethod === 'phone' && (
              <Text className="text-sm text-gray-500 mt-4 text-center">
                We'll send you a verification code via SMS
              </Text>
            )}

            {/* Toggle sign-in / sign-up */}
            <View className="mt-8 flex-row justify-center">
              <Text className="text-gray-600">
                {authMode === 'sign-in' ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <Pressable onPress={toggleAuthMode}>
                <Text className="text-primary-500 font-semibold">
                  {authMode === 'sign-in' ? 'Sign up' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
