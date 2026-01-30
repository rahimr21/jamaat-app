// App configuration constants
export const config = {
  // API endpoints
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // Aladhan Prayer Times API
  aladhanBaseUrl: 'https://api.aladhan.com/v1',
  aladhanMethod: 2, // ISNA calculation method
  aladhanSchool: 0, // Shafi juristic school

  // Location settings
  defaultRadiusMeters: 3218, // 2 miles
  maxRadiusMeters: 16093, // 10 miles

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
} as const;

export type Config = typeof config;
