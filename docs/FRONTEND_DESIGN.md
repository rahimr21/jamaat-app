# Frontend Design Document

**Last Updated**: January 29, 2026  
**Version**: 1.0

## Overview

This document defines the visual design, component architecture, and frontend patterns for Jamaat. All UI implementations should reference this guide to maintain consistency.

---

## 1. Design System

### 1.1 Color Palette

```typescript
// theme/colors.ts
export const colors = {
  // Primary (Islamic green)
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#28A745',  // Main brand color
    600: '#1E7B34',  // Darker for active states
    700: '#166129',
    800: '#0F471F',
    900: '#082D14',
  },
  
  // Neutrals
  gray: {
    50: '#F8F9FA',   // Surface backgrounds
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',  // Borders
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',  // Secondary text
    700: '#495057',
    800: '#343A40',
    900: '#212529',  // Primary text
  },
  
  // Semantic colors
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  info: '#17A2B8',
  
  // Special
  background: '#FFFFFF',
  surface: '#F8F9FA',
  overlay: 'rgba(0, 0, 0, 0.5)',
};
```

### 1.2 Typography

```typescript
// theme/typography.ts
export const typography = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
  },
  
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Text styles
export const textStyles = {
  h1: {
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.lineHeight['3xl'],
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  h2: {
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.lineHeight['2xl'],
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.semibold,
  },
  h3: {
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.semibold,
  },
  body: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    fontWeight: typography.fontWeight.regular,
    fontFamily: typography.fontFamily.regular,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.fontWeight.regular,
    fontFamily: typography.fontFamily.regular,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.fontWeight.regular,
    fontFamily: typography.fontFamily.regular,
  },
  button: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.semibold,
  },
};
```

### 1.3 Spacing System

```typescript
// theme/spacing.ts
export const spacing = {
  0: 0,
  1: 4,    // 0.25rem
  2: 8,    // 0.5rem
  3: 12,   // 0.75rem
  4: 16,   // 1rem (base unit)
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// Common padding/margin presets
export const spacingPresets = {
  containerPadding: spacing[4],     // 16px
  cardPadding: spacing[4],          // 16px
  sectionSpacing: spacing[6],       // 24px
  stackSpacing: spacing[3],         // 12px
  inlineSpacing: spacing[2],        // 8px
};
```

### 1.4 Border Radius

```typescript
// theme/borderRadius.ts
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### 1.5 Shadows

```typescript
// theme/shadows.ts
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## 2. Component Library

### 2.1 Base Components

#### Button
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  children: ReactNode;
}

// Variants
const variants = {
  primary: {
    bg: colors.primary[500],
    text: colors.gray[50],
    pressedBg: colors.primary[600],
  },
  secondary: {
    bg: colors.gray[100],
    text: colors.gray[900],
    pressedBg: colors.gray[200],
  },
  outline: {
    bg: 'transparent',
    text: colors.primary[500],
    border: colors.primary[500],
    pressedBg: colors.primary[50],
  },
  ghost: {
    bg: 'transparent',
    text: colors.gray[700],
    pressedBg: colors.gray[100],
  },
};

// Sizes
const sizes = {
  sm: { height: 36, paddingX: 12, fontSize: 14 },
  md: { height: 48, paddingX: 16, fontSize: 16 },
  lg: { height: 56, paddingX: 24, fontSize: 18 },
};

// Usage
<Button variant="primary" size="md" onPress={handleSubmit}>
  Create Session
</Button>
```

#### Card
```typescript
// components/ui/Card.tsx
interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

// Base styles
const cardStyles = {
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing[4],
  ...shadows.base,
};

// Usage
<Card onPress={() => navigateToSession(session.id)}>
  <SessionCardContent session={session} />
</Card>
```

#### Input
```typescript
// components/ui/Input.tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// States
const inputStates = {
  default: {
    borderColor: colors.gray[300],
    backgroundColor: colors.background,
  },
  focus: {
    borderColor: colors.primary[500],
    backgroundColor: colors.background,
  },
  error: {
    borderColor: colors.error,
    backgroundColor: colors.background,
  },
  disabled: {
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
};

// Usage
<Input
  label="Display Name"
  value={name}
  onChangeText={setName}
  error={nameError}
  placeholder="Enter your name"
  maxLength={50}
/>
```

### 2.2 Prayer Components

#### SessionCard
```typescript
// components/prayer/SessionCard.tsx
interface SessionCardProps {
  session: PrayerSession;
  onJoin: () => void;
  onLeave: () => void;
  isAttending: boolean;
  isCreator: boolean;
}

// Layout
<Card>
  <CardHeader>
    <PrayerIcon type={session.prayer_type} />
    <PrayerType>{session.prayer_type}</PrayerType>
    <Time>{formatTime(session.scheduled_time)}</Time>
  </CardHeader>
  
  <Location>
    <LocationIcon />
    <LocationText>{session.location_name}</LocationText>
    {session.distance && <Distance>({session.distance})</Distance>}
  </Location>
  
  <Attendees>
    <AvatarGroup users={session.attendees} max={3} />
    <AttendeeCount>{session.attendee_count} attending</AttendeeCount>
  </Attendees>
  
  {session.notes && <Notes>{session.notes}</Notes>}
  
  <Actions>
    {isCreator ? (
      <CreatorBadge>You created this prayer</CreatorBadge>
    ) : isAttending ? (
      <Button variant="secondary" onPress={onLeave}>
        Joined ✓
      </Button>
    ) : (
      <Button variant="primary" onPress={onJoin}>
        Join
      </Button>
    )}
  </Actions>
</Card>

// Visual specs
const cardSpecs = {
  minHeight: 120,
  padding: spacing[4],
  gap: spacing[3],
  borderRadius: borderRadius.md,
  shadow: shadows.base,
};
```

#### PrayerTimesDisplay
```typescript
// components/prayer/PrayerTimesDisplay.tsx
interface PrayerTimesDisplayProps {
  times: PrayerTimes;
  currentPrayer: PrayerType;
}

// Layout (horizontal scroll)
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {Object.entries(times).map(([prayer, time]) => (
    <PrayerTimeItem
      key={prayer}
      prayer={prayer}
      time={time}
      isActive={prayer === currentPrayer}
    />
  ))}
</ScrollView>

// PrayerTimeItem
const PrayerTimeItem = ({ prayer, time, isActive }) => (
  <View style={[
    styles.item,
    isActive && styles.activeItem
  ]}>
    <PrayerName isActive={isActive}>{prayer}</PrayerName>
    <Time isActive={isActive}>{time}</Time>
  </View>
);

// Specs
const itemSpecs = {
  width: 80,
  height: 60,
  marginRight: spacing[2],
  backgroundColor: isActive ? colors.primary[500] : colors.gray[50],
  borderRadius: borderRadius.base,
  padding: spacing[2],
};
```

#### LocationPicker
```typescript
// components/prayer/LocationPicker.tsx
interface LocationPickerProps {
  value: LocationOption;
  onChange: (location: LocationOption) => void;
  universityId?: string;
}

// Layout
<View>
  <RadioGroup value={locationType} onChange={setLocationType}>
    <RadioOption value="campus">
      Campus Prayer Space
    </RadioOption>
    <RadioOption value="current">
      My Current Location
    </RadioOption>
  </RadioGroup>
  
  {locationType === 'campus' && (
    <DropdownPicker
      items={prayerSpaces}
      value={selectedSpace}
      onValueChange={setSelectedSpace}
      placeholder="Select a prayer space"
    />
  )}
  
  {locationType === 'current' && (
    <CurrentLocationDisplay
      location={currentLocation}
      loading={loadingLocation}
    />
  )}
</View>
```

---

## 3. Screen Layouts

### 3.1 Main Feed Layout

```typescript
// app/(tabs)/index.tsx
<SafeAreaView>
  <Header>
    <Logo />
    <LocationSelector />
    <SettingsButton />
  </Header>
  
  <PrayerTimesStrip times={prayerTimes} current={currentPrayer} />
  
  <FlatList
    data={sessions}
    renderItem={({ item }) => (
      <SessionCard
        session={item}
        onJoin={() => handleJoin(item.id)}
        onLeave={() => handleLeave(item.id)}
        isAttending={item.is_attending}
      />
    )}
    keyExtractor={(item) => item.id}
    contentContainerStyle={styles.list}
    refreshControl={
      <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
    }
    onEndReached={loadMore}
    onEndReachedThreshold={0.5}
    ListEmptyComponent={<EmptyState />}
  />
  
  <FAB onPress={navigateToCreate} />
</SafeAreaView>

// Styles
const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  // ... other styles
});
```

### 3.2 Create Session Layout

```typescript
// app/(tabs)/create.tsx
<KeyboardAvoidingView>
  <ScrollView contentContainerStyle={styles.form}>
    <FormSection title="Prayer Type">
      <PrayerTypeSelector
        value={prayerType}
        onChange={setPrayerType}
      />
    </FormSection>
    
    <FormSection title="Location">
      <LocationPicker
        value={location}
        onChange={setLocation}
        universityId={user.university_id}
      />
    </FormSection>
    
    <FormSection title="Time">
      <DateTimePicker
        mode="datetime"
        value={scheduledTime}
        onChange={setScheduledTime}
        minimumDate={new Date()}
      />
    </FormSection>
    
    <FormSection title="Notes (Optional)">
      <Input
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Bring prayer rug"
        maxLength={500}
      />
      <CharacterCount>
        {notes.length} / 500
      </CharacterCount>
    </FormSection>
    
    <Button
      variant="primary"
      size="lg"
      fullWidth
      onPress={handleSubmit}
      loading={isSubmitting}
      disabled={!isValid}
    >
      Create Session
    </Button>
  </ScrollView>
</KeyboardAvoidingView>

// Specs
const formSpecs = {
  padding: spacing[4],
  gap: spacing[6], // Space between sections
};
```

### 3.3 Settings Layout

```typescript
// app/(tabs)/settings.tsx
<ScrollView>
  <SettingsSection title="Profile">
    <SettingsRow
      label="Display Name"
      value={user.display_name}
      onPress={showEditNameModal}
      rightIcon={<ChevronRightIcon />}
    />
    <SettingsRow
      label="Email"
      value={user.email}
      rightIcon={<VerifiedBadge />}
    />
  </SettingsSection>
  
  <SettingsSection title="Student Status">
    <SettingsRow
      label="University"
      value={user.university?.name || 'Not set'}
      onPress={showUniversityPicker}
      rightIcon={<ChevronRightIcon />}
    />
  </SettingsSection>
  
  <SettingsSection title="Notifications">
    <SettingsToggle
      label="New prayers near me"
      value={prefs.new_prayers}
      onValueChange={(v) => updatePref('new_prayers', v)}
    />
    <SettingsToggle
      label="Someone joins my prayer"
      value={prefs.prayer_joined}
      onValueChange={(v) => updatePref('prayer_joined', v)}
    />
  </SettingsSection>
  
  <SettingsSection title="About">
    <SettingsRow
      label="Version"
      value="1.0.0"
    />
    <SettingsRow
      label="Privacy Policy"
      onPress={openPrivacyPolicy}
      rightIcon={<ExternalLinkIcon />}
    />
  </SettingsSection>
  
  <SettingsSection>
    <Button variant="outline" onPress={handleLogout}>
      Log Out
    </Button>
  </SettingsSection>
</ScrollView>
```

---

## 4. Icons & Illustrations

### 4.1 Icon Library

Use **Lucide React Native** for consistency:

```typescript
import { 
  MapPin,
  Clock,
  Users,
  Plus,
  Settings,
  ChevronRight,
  Check,
  X,
  Bell,
  BellOff,
  Calendar,
  Search,
  Filter,
  ExternalLink,
  Home,
  User,
} from 'lucide-react-native';

// Icon sizes
const iconSizes = {
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
};

// Icon colors (use theme colors)
const iconColor = colors.gray[600];
```

### 4.2 Prayer Type Icons

```typescript
// components/prayer/PrayerIcon.tsx
const prayerIcons = {
  fajr: '🌅',    // Sunrise
  dhuhr: '☀️',   // Sun
  asr: '🌤️',    // Partly sunny
  maghrib: '🌆', // Sunset
  isha: '🌙',    // Moon
  jummah: '🕌',  // Mosque
};

const PrayerIcon = ({ type, size = 24 }) => (
  <Text style={{ fontSize: size }}>
    {prayerIcons[type]}
  </Text>
);
```

### 4.3 Empty State Illustrations

Use simple SVG illustrations:

```typescript
// components/common/EmptyState.tsx
<View style={styles.emptyState}>
  <MosqueIllustration width={120} height={120} />
  <Heading>No prayers scheduled yet</Heading>
  <Body>Be the first to create a prayer session</Body>
  <Button onPress={navigateToCreate}>Create Prayer</Button>
</View>

// Generate SVGs with https://undraw.co/ or similar
```

---

## 5. Animations & Interactions

### 5.1 Animation Library

Use **React Native Reanimated** for smooth animations:

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
```

### 5.2 Common Animations

#### Button Press
```typescript
const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

const handlePressIn = () => {
  scale.value = withSpring(0.98);
};

const handlePressOut = () => {
  scale.value = withSpring(1);
};

<Animated.View style={animatedStyle}>
  <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
    {children}
  </Pressable>
</Animated.View>
```

#### FAB Rotation
```typescript
const rotation = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}deg` }],
}));

const handlePress = () => {
  rotation.value = withTiming(45, { duration: 200 });
  // Navigate to create screen
};

<Animated.View style={animatedStyle}>
  <FAB onPress={handlePress} />
</Animated.View>
```

#### Slide-in Modal
```typescript
const translateY = useSharedValue(300);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
}));

useEffect(() => {
  if (isVisible) {
    translateY.value = withSpring(0);
  } else {
    translateY.value = withTiming(300);
  }
}, [isVisible]);

<Animated.View style={[styles.modal, animatedStyle]}>
  {children}
</Animated.View>
```

### 5.3 Haptic Feedback

```typescript
import * as Haptics from 'expo-haptics';

// On button press
const handleJoin = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // ... join logic
};

// On error
const showError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  // ... show error
};

// On success
const showSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // ... show success
};
```

---

## 6. Accessibility

### 6.1 Requirements

- **Minimum touch target**: 44x44 pt (iOS), 48x48 dp (Android)
- **Color contrast**: WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Font scaling**: Support up to 200% text size
- **Screen reader**: Proper labels for all interactive elements

### 6.2 Implementation

```typescript
// Accessible button
<Pressable
  accessible={true}
  accessibilityLabel="Join Dhuhr prayer at 12:30 PM"
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled }}
  accessibilityHint="Double tap to join this prayer session"
  onPress={handleJoin}
>
  <Text>Join</Text>
</Pressable>

// Accessible icon button
<Pressable
  accessible={true}
  accessibilityLabel="Settings"
  accessibilityRole="button"
  onPress={navigateToSettings}
>
  <SettingsIcon size={24} />
</Pressable>

// Screen reader announcements
import { AccessibilityInfo } from 'react-native';

const announceSuccess = () => {
  AccessibilityInfo.announceForAccessibility(
    'Prayer session created successfully'
  );
};
```

### 6.3 Dynamic Type (Font Scaling)

```typescript
import { useWindowDimensions, PixelRatio } from 'react-native';

const useDynamicFontSize = (baseSize: number) => {
  const { fontScale } = useWindowDimensions();
  return Math.round(baseSize * Math.min(fontScale, 2)); // Cap at 200%
};

// Usage
const fontSize = useDynamicFontSize(16);
<Text style={{ fontSize }}>{text}</Text>
```

---

## 7. Responsive Design

### 7.1 Breakpoints

```typescript
// theme/breakpoints.ts
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

// Hook for responsive design
const useResponsive = () => {
  const { width } = useWindowDimensions();
  
  return {
    isPhone: width < breakpoints.tablet,
    isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop,
  };
};

// Usage
const { isTablet } = useResponsive();

<View style={[
  styles.container,
  isTablet && styles.containerTablet,
]}>
  {children}
</View>
```

### 7.2 Layout Strategies

#### Phone (default)
- Single column
- Full-width cards
- Bottom tab navigation

#### Tablet (future)
- Two-column layout for feed
- Side-by-side create form
- Larger touch targets

---

## 8. Loading States

### 8.1 Skeleton Screens

```typescript
// components/common/Skeleton.tsx
import { Skeleton } from 'moti/skeleton';

const SessionCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton width="40%" height={24} radius={4} />
    <Skeleton width="60%" height={20} radius={4} />
    <Skeleton width="80%" height={16} radius={4} />
    <Skeleton width="100%" height={48} radius={8} />
  </View>
);

// Usage in feed
{isLoading ? (
  <>
    <SessionCardSkeleton />
    <SessionCardSkeleton />
    <SessionCardSkeleton />
  </>
) : (
  sessions.map(session => <SessionCard key={session.id} session={session} />)
)}
```

### 8.2 Loading Indicators

```typescript
// Button loading state
<Button loading={isSubmitting}>
  {isSubmitting ? (
    <ActivityIndicator color={colors.gray[50]} />
  ) : (
    <Text>Create Session</Text>
  )}
</Button>

// Full-screen loading
<View style={styles.loadingContainer}>
  <ActivityIndicator size="large" color={colors.primary[500]} />
  <Text style={styles.loadingText}>Loading prayers...</Text>
</View>
```

---

## 9. Error States

### 9.1 Inline Errors

```typescript
// Form field error
<Input
  label="Display Name"
  value={name}
  onChangeText={setName}
  error={nameError}
/>
{nameError && (
  <Text style={styles.errorText}>
    {nameError}
  </Text>
)}

// Styles
const styles = StyleSheet.create({
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },
});
```

### 9.2 Toast Notifications

```typescript
// components/common/Toast.tsx
import Toast from 'react-native-toast-message';

// Show toast
export const showToast = (type: 'success' | 'error' | 'info', message: string) => {
  Toast.show({
    type,
    text1: message,
    position: 'bottom',
    visibilityTime: 3000,
  });
};

// Usage
showToast('success', 'Prayer session created!');
showToast('error', 'Failed to join session. Try again.');
```

### 9.3 Error Boundaries

```typescript
// components/common/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Button onPress={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}
```

---

## 10. Performance Optimization

### 10.1 Image Optimization

```typescript
import { Image } from 'expo-image';

// Use expo-image for better caching
<Image
  source={{ uri: avatarUrl }}
  style={styles.avatar}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk" // Cache both in memory and disk
/>
```

### 10.2 List Optimization

```typescript
// Use optimized list for feed
<FlashList
  data={sessions}
  renderItem={renderSessionCard}
  estimatedItemSize={140} // Approximate height for better scrolling
  keyExtractor={(item) => item.id}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

### 10.3 Memoization

```typescript
// Memoize expensive components
const SessionCard = React.memo(({ session, onJoin, onLeave }) => {
  // ... component logic
}, (prevProps, nextProps) => {
  // Custom comparison for re-render
  return prevProps.session.id === nextProps.session.id &&
         prevProps.session.attendee_count === nextProps.session.attendee_count;
});

// Memoize callbacks
const handleJoin = useCallback((sessionId: string) => {
  // ... join logic
}, []);
```

---

## 11. Dark Mode (Future)

### 11.1 Color System

```typescript
// theme/colors.ts (extended)
export const darkColors = {
  primary: {
    // Keep same primary colors
    500: '#28A745',
    600: '#1E7B34',
  },
  gray: {
    50: '#1A1D1F',    // Dark background
    100: '#25282B',   // Surface
    200: '#2F3437',
    300: '#3A3F45',   // Borders
    500: '#6C737A',
    900: '#FFFFFF',   // Text
  },
  background: '#1A1D1F',
  surface: '#25282B',
};

// Hook for theme
const useTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : colors;
};
```

---

## 12. NativeWind Setup

### 12.1 Configuration

```typescript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#28A745',
          dark: '#1E7B34',
        },
        // ... rest of color palette
      },
    },
  },
  plugins: [],
};
```

### 12.2 Usage Examples

```typescript
// Using NativeWind classes
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Jamaat
  </Text>
  <Button className="bg-primary rounded-lg px-4 py-3">
    <Text className="text-white font-semibold">Create Prayer</Text>
  </Button>
</View>

// Conditional classes
<View className={`p-4 rounded-lg ${isActive ? 'bg-primary' : 'bg-gray-100'}`}>
  {children}
</View>
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 29, 2026 | Initial design system |

---

**Next Review**: After MVP launch (estimate: March 2026)
