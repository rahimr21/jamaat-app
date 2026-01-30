import { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingsRow({ label, value, onPress, rightElement }: SettingsRowProps) {
  const content = (
    <View className="flex-row items-center justify-between py-4 px-4">
      <Text className="text-base text-gray-900">{label}</Text>
      {rightElement || (
        <View className="flex-row items-center">
          {value && <Text className="text-gray-500 mr-2">{value}</Text>}
          {onPress && <Text className="text-gray-400">›</Text>}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:bg-gray-50">
        {content}
      </Pressable>
    );
  }

  return content;
}

function SettingsSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      {title && (
        <Text className="text-sm font-medium text-gray-500 uppercase px-4 mb-2">
          {title}
        </Text>
      )}
      <View className="bg-white rounded-xl border border-gray-100">
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, fetchProfile } = useAuthStore();

  // Notification preferences
  const [newPrayers, setNewPrayers] = useState(profile?.notification_preferences?.new_prayers ?? true);
  const [prayerJoined, setPrayerJoined] = useState(profile?.notification_preferences?.prayer_joined ?? true);
  const [dailyReminders, setDailyReminders] = useState(profile?.notification_preferences?.daily_reminders ?? false);

  const updateNotificationPref = async (key: string, value: boolean) => {
    if (!profile) return;

    const newPrefs = {
      ...profile.notification_preferences,
      [key]: value,
    };

    await supabase
      .from('users')
      .update({ notification_preferences: newPrefs })
      .eq('id', profile.id);

    await fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900 mb-6">Settings</Text>

        {/* Profile Section */}
        <SettingsSection title="Profile">
          <SettingsRow
            label="Display Name"
            value={profile?.display_name}
            onPress={() => {
              // TODO: Implement edit name modal
              Alert.alert('Edit Name', 'Coming soon!');
            }}
          />
          <Divider />
          <SettingsRow
            label="Email"
            value={profile?.email || 'Not set'}
          />
          <Divider />
          <SettingsRow
            label="Phone"
            value={profile?.phone || 'Not set'}
          />
        </SettingsSection>

        {/* Student Section */}
        <SettingsSection title="Student Status">
          <SettingsRow
            label="University"
            value={profile?.is_student ? 'Linked' : 'Not a student'}
            onPress={() => {
              router.push('/(auth)/university');
            }}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <SettingsRow
            label="New prayers near me"
            rightElement={
              <Switch
                value={newPrayers}
                onValueChange={(value) => {
                  setNewPrayers(value);
                  updateNotificationPref('new_prayers', value);
                }}
                trackColor={{ false: '#DEE2E6', true: '#28A745' }}
              />
            }
          />
          <Divider />
          <SettingsRow
            label="Someone joins my prayer"
            rightElement={
              <Switch
                value={prayerJoined}
                onValueChange={(value) => {
                  setPrayerJoined(value);
                  updateNotificationPref('prayer_joined', value);
                }}
                trackColor={{ false: '#DEE2E6', true: '#28A745' }}
              />
            }
          />
          <Divider />
          <SettingsRow
            label="Daily prayer reminders"
            rightElement={
              <Switch
                value={dailyReminders}
                onValueChange={(value) => {
                  setDailyReminders(value);
                  updateNotificationPref('daily_reminders', value);
                }}
                trackColor={{ false: '#DEE2E6', true: '#28A745' }}
              />
            }
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsRow
            label="Version"
            value="1.0.0"
          />
          <Divider />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => {
              // TODO: Open privacy policy
              Alert.alert('Privacy Policy', 'Coming soon!');
            }}
          />
          <Divider />
          <SettingsRow
            label="Terms of Service"
            onPress={() => {
              // TODO: Open terms of service
              Alert.alert('Terms of Service', 'Coming soon!');
            }}
          />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection>
          <Pressable
            className="py-4 px-4 active:bg-gray-50"
            onPress={handleLogout}
          >
            <Text className="text-center text-red-500 font-medium">Log Out</Text>
          </Pressable>
        </SettingsSection>

        {/* Footer */}
        <Text className="text-center text-gray-400 text-sm mt-4">
          Made with ❤️ for the Muslim community
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
