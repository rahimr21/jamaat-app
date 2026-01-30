// Location filter modal component
import { config } from '@/constants';
import { Modal, Pressable, Text, View } from 'react-native';

export interface LocationFilter {
  type: 'radius' | 'campus';
  radiusMeters: number;
  universityId?: string;
  universityName?: string;
  campusLocation?: { latitude: number; longitude: number };
}

interface LocationFilterModalProps {
  visible: boolean;
  currentFilter: LocationFilter;
  hasUniversity: boolean;
  universityName?: string;
  onSelectFilter: (filter: LocationFilter) => void;
  onClose: () => void;
}

export function LocationFilterModal({
  visible,
  currentFilter,
  hasUniversity,
  universityName,
  onSelectFilter,
  onClose,
}: LocationFilterModalProps) {
  const handleSelectRadius = (radiusMeters: number) => {
    onSelectFilter({ type: 'radius', radiusMeters });
    onClose();
  };

  const handleSelectCampus = () => {
    if (!hasUniversity) return;
    onSelectFilter({
      type: 'campus',
      radiusMeters: config.defaultRadiusMeters,
      universityName,
    });
    onClose();
  };

  const isSelected = (type: 'radius' | 'campus', radiusMeters?: number) => {
    if (type === 'campus') {
      return currentFilter.type === 'campus';
    }
    return currentFilter.type === 'radius' && currentFilter.radiusMeters === radiusMeters;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={onClose}>
        <Pressable
          className="bg-white rounded-xl overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 text-center">
              Filter by Location
            </Text>
          </View>

          {/* Options */}
          <View className="py-2">
            {/* Near me options */}
            {config.radiusOptions.map((option) => (
              <Pressable
                key={option.value}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  isSelected('radius', option.value) ? 'bg-primary-50' : ''
                }`}
                onPress={() => handleSelectRadius(option.value)}
              >
                <View className="flex-row items-center">
                  <Text className="mr-2">📍</Text>
                  <Text className="text-gray-900">Near me ({option.label})</Text>
                </View>
                {isSelected('radius', option.value) && <Text className="text-primary-500">✓</Text>}
              </Pressable>
            ))}

            {/* Campus option */}
            {hasUniversity && (
              <>
                <View className="h-px bg-gray-100 mx-4 my-2" />
                <Pressable
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    isSelected('campus') ? 'bg-primary-50' : ''
                  }`}
                  onPress={handleSelectCampus}
                >
                  <View className="flex-row items-center">
                    <Text className="mr-2">🏫</Text>
                    <Text className="text-gray-900">{universityName ?? 'My campus'}</Text>
                  </View>
                  {isSelected('campus') && <Text className="text-primary-500">✓</Text>}
                </Pressable>
              </>
            )}
          </View>

          {/* Cancel button */}
          <Pressable className="p-4 border-t border-gray-100" onPress={onClose}>
            <Text className="text-center text-gray-500 font-medium">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
