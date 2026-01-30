// App configuration constants
export const config = {
  // API endpoints
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // Aladhan Prayer Times API
  aladhanBaseUrl: 'https://api.aladhan.com/v1',
  aladhanMethod: 2, // ISNA calculation method
  aladhanSchool: 0, // Shafi juristic school

  // Google Maps
  googleMapsApiKeyAndroid: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? '',
  googleMapsApiKeyIOS: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? '',

  // Location settings
  defaultRadiusMeters: 3218, // 2 miles
  maxRadiusMeters: 16093, // 10 miles

  // Radius filter options (in meters)
  radiusOptions: [
    { label: '2 miles', value: 3218 },
    { label: '5 miles', value: 8047 },
    { label: '10 miles', value: 16093 },
  ] as const,

  // Rate limits
  maxSessionsPerDay: 10,
  maxSpacesPerHour: 3,

  // Cache TTL (milliseconds)
  prayerTimesCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  universitiesCacheTTL: 7 * 24 * 60 * 60 * 1000, // 1 week

  // UI constants
  debounceDelay: 300, // Search debounce
  animationDuration: 200,

  // Deep linking
  scheme: 'jamaat',

  // App store
  appVersion: '1.0.0',
  buildNumber: 1,

  // Support & Legal
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@jamaat-app.com',
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '',
  termsOfServiceUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
} as const;

export type Config = typeof config;
