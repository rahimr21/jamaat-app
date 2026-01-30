// Attendee list modal component
import { fetchSessionAttendees, type SessionAttendee } from '@/lib/api/sessions';
import { formatRelativeTime } from '@/lib/utils/date';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';

interface AttendeeListModalProps {
  visible: boolean;
  sessionId: string;
  attendeeCount: number;
  onClose: () => void;
}

export function AttendeeListModal({
  visible,
  sessionId,
  attendeeCount,
  onClose,
}: AttendeeListModalProps) {
  const [attendees, setAttendees] = useState<SessionAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && sessionId) {
      loadAttendees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sessionId]);

  const loadAttendees = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchSessionAttendees(sessionId);

    if (fetchError) {
      setError('Could not load attendees');
    } else {
      setAttendees(data ?? []);
    }

    setIsLoading(false);
  };

  const renderAttendee = ({ item }: { item: SessionAttendee }) => (
    <View className="flex-row items-center py-3 px-4 border-b border-gray-100">
      <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
        <Text className="text-primary-600 font-semibold text-lg">
          {item.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-medium">{item.display_name}</Text>
        <Text className="text-gray-500 text-sm">Joined {formatRelativeTime(item.joined_at)}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-2xl max-h-[70%]"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">Attendees ({attendeeCount})</Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center">
              <Text className="text-gray-500 text-xl">×</Text>
            </Pressable>
          </View>

          {/* Content */}
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#28A745" />
              <Text className="text-gray-500 mt-2">Loading attendees...</Text>
            </View>
          ) : error ? (
            <View className="py-12 items-center px-4">
              <Text className="text-red-500 text-center">{error}</Text>
              <Pressable onPress={loadAttendees} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
                <Text className="text-gray-700">Try again</Text>
              </Pressable>
            </View>
          ) : attendees.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-gray-500">No attendees yet</Text>
            </View>
          ) : (
            <FlatList
              data={attendees}
              renderItem={renderAttendee}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
