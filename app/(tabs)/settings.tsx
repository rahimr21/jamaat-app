import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/constants';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <Text className="text-sm font-medium text-gray-500 uppercase px-4 mb-2">{title}</Text>
      )}
      <View className="bg-white rounded-xl border border-gray-100">{children}</View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

// Get app version from Expo config or fallback to constants
function getAppVersion(): string {
  return Constants.expoConfig?.version ?? config.appVersion;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut, fetchProfile } = useAuthStore();

  // Edit display name modal
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState(profile?.display_name ?? '');
  const [editNameSaving, setEditNameSaving] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  useEffect(() => {
    if (showEditNameModal) {
      setEditNameValue(profile?.display_name ?? '');
      setEditNameError(null);
    }
  }, [showEditNameModal, profile?.display_name]);

  // Notification preferences
  const [newPrayers, setNewPrayers] = useState(
    profile?.notification_preferences?.new_prayers ?? true
  );
  const [prayerJoined, setPrayerJoined] = useState(
    profile?.notification_preferences?.prayer_joined ?? true
  );
  const [dailyReminders, setDailyReminders] = useState(
    profile?.notification_preferences?.daily_reminders ?? false
  );

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

  const handleSaveDisplayName = async () => {
    const trimmed = editNameValue.trim();
    if (trimmed.length < 2) {
      setEditNameError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 50) {
      setEditNameError('Name must be less than 50 characters');
      return;
    }
    if (!profile) return;
    setEditNameError(null);
    setEditNameSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: trimmed })
        .eq('id', profile.id);
      if (error) throw error;
      await fetchProfile();
      setShowEditNameModal(false);
    } catch (err) {
      setEditNameError((err as Error).message);
    } finally {
      setEditNameSaving(false);
    }
  };

  const handlePrivacyPolicy = async () => {
    if (config.privacyPolicyUrl) {
      await WebBrowser.openBrowserAsync(config.privacyPolicyUrl);
    } else {
      Alert.alert(
        'Privacy Policy',
        'Coming soon! Our privacy policy will be available before the app launches.'
      );
    }
  };

  const handleTermsOfService = async () => {
    if (config.termsOfServiceUrl) {
      await WebBrowser.openBrowserAsync(config.termsOfServiceUrl);
    } else {
      Alert.alert(
        'Terms of Service',
        'Coming soon! Our terms of service will be available before the app launches.'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
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
            onPress={() => setShowEditNameModal(true)}
          />
          <Divider />
          <SettingsRow label="Email" value={profile?.email || 'Not set'} />
          <Divider />
          <SettingsRow label="Phone" value={profile?.phone || 'Not set'} />
        </SettingsSection>

        {/* Student Section */}
        <SettingsSection title="Student Status">
          <SettingsRow
            label="University"
            value={profile?.is_student ? 'Linked' : 'Not a student'}
            onPress={() => {
              router.push('/(auth)/university?from=settings');
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
          <SettingsRow label="Version" value={getAppVersion()} />
          <Divider />
          <SettingsRow label="Privacy Policy" onPress={handlePrivacyPolicy} />
          <Divider />
          <SettingsRow label="Terms of Service" onPress={handleTermsOfService} />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection>
          <Pressable className="py-4 px-4 active:bg-gray-50" onPress={handleLogout}>
            <Text className="text-center text-red-500 font-medium">Log Out</Text>
          </Pressable>
        </SettingsSection>

        {/* Footer */}
        <Text className="text-center text-gray-400 text-sm mt-4">
          Made with ❤️ for the Muslim community
        </Text>
      </ScrollView>

      {/* Edit display name modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center px-6"
          onPress={() => setShowEditNameModal(false)}
        >
          <Pressable className="bg-white rounded-xl p-6" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-semibold text-gray-900 mb-2">Edit display name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 mb-2"
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={editNameValue}
              onChangeText={setEditNameValue}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={50}
            />
            {editNameError && <Text className="text-red-500 text-sm mb-2">{editNameError}</Text>}
            <View className="flex-row gap-3 mt-2">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-gray-100 items-center"
                onPress={() => setShowEditNameModal(false)}
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                className={`flex-1 py-3 rounded-lg items-center ${editNameSaving || editNameValue.trim().length < 2 ? 'bg-gray-400' : 'bg-primary-500'}`}
                onPress={handleSaveDisplayName}
                disabled={editNameSaving || editNameValue.trim().length < 2}
              >
                <Text className="text-white font-medium">
                  {editNameSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
