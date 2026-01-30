import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        {/* Logo */}
        <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center mb-8">
          <Text className="text-white text-4xl font-bold">J</Text>
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          Jamaat
        </Text>

        {/* Tagline */}
        <Text className="text-lg text-gray-600 text-center mb-12 px-4">
          Find and join congregational prayers near you
        </Text>

        {/* Get Started Button */}
        <Pressable
          className="w-full bg-primary-500 py-4 rounded-xl items-center active:bg-primary-600"
          onPress={() => router.push('/(auth)/login')}
        >
          <Text className="text-white text-lg font-semibold">Get Started</Text>
        </Pressable>

        {/* Footer */}
        <Text className="text-sm text-gray-500 mt-8 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}
