import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudentScreen() {
  const router = useRouter();

  const handleYes = () => {
    router.push('/(auth)/university');
  };

  const handleSkip = () => {
    router.push('/(auth)/permissions');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        {/* Progress indicator */}
        <View className="flex-row mb-8">
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-primary-500 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-gray-200 rounded-full mr-1" />
          <View className="flex-1 h-1 bg-gray-200 rounded-full" />
        </View>

        {/* Icon */}
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-6">
          <Text className="text-4xl">🎓</Text>
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Are you a student?
        </Text>
        <Text className="text-gray-600 mb-8">
          Students get access to campus-specific prayer spaces and can connect with others at their university.
        </Text>

        {/* Options */}
        <Pressable
          className="w-full bg-primary-500 py-4 rounded-xl items-center mb-4 active:bg-primary-600"
          onPress={handleYes}
        >
          <Text className="text-white text-lg font-semibold">Yes, I'm a student</Text>
        </Pressable>

        <Pressable
          className="w-full bg-gray-100 py-4 rounded-xl items-center active:bg-gray-200"
          onPress={handleSkip}
        >
          <Text className="text-gray-700 text-lg font-semibold">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
