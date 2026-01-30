// Zod validation schemas
import { z } from 'zod';

// Prayer types enum
export const prayerTypeSchema = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah']);

// Location schema
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Create session form schema
export const createSessionSchema = z.object({
  prayerType: prayerTypeSchema,
  locationType: z.enum(['campus', 'current']),
  prayerSpaceId: z.string().uuid().optional(),
  customLocation: locationSchema.optional(),
  customLocationName: z.string().max(100).optional(),
  scheduledTime: z.date().refine(
    (date) => date > new Date(),
    { message: 'Cannot schedule prayer in the past' }
  ),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.locationType === 'campus') {
      return !!data.prayerSpaceId;
    }
    return !!data.customLocation;
  },
  {
    message: 'Must provide either prayer space or custom location',
    path: ['locationType'],
  }
);

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// Profile update schema
export const updateProfileSchema = z.object({
  displayName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// University search schema
export const universitySearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
});

// Phone number validation (basic)
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number');

// Email validation
export const emailSchema = z.string()
  .email('Please enter a valid email address');

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  new_prayers: z.boolean(),
  prayer_joined: z.boolean(),
  daily_reminders: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

// Helper to extract Zod error messages
export function getZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// Helper to get first error message
export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validation error';
}
