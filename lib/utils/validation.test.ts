import {
  createSessionSchema,
  prayerTypeSchema,
  locationSchema,
  updateProfileSchema,
  emailSchema,
  phoneSchema,
  getZodErrors,
  getFirstZodError,
} from './validation';

describe('validation utilities', () => {
  describe('prayerTypeSchema', () => {
    it('should accept valid prayer types', () => {
      const validTypes = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'];
      validTypes.forEach((type) => {
        const result = prayerTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid prayer types', () => {
      const result = prayerTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('locationSchema', () => {
    it('should accept valid coordinates', () => {
      const result = locationSchema.safeParse({
        latitude: 42.3601,
        longitude: -71.0589,
      });
      expect(result.success).toBe(true);
    });

    it('should reject latitude out of range', () => {
      const result = locationSchema.safeParse({
        latitude: 91,
        longitude: -71.0589,
      });
      expect(result.success).toBe(false);
    });

    it('should reject longitude out of range', () => {
      const result = locationSchema.safeParse({
        latitude: 42.3601,
        longitude: 181,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createSessionSchema', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

    it('should accept valid session with campus location', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'dhuhr',
        locationType: 'campus',
        prayerSpaceId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledTime: futureDate,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid session with custom location', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'asr',
        locationType: 'current',
        customLocation: { latitude: 42.3601, longitude: -71.0589 },
        scheduledTime: futureDate,
      });
      expect(result.success).toBe(true);
    });

    it('should reject session with past time', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const result = createSessionSchema.safeParse({
        prayerType: 'dhuhr',
        locationType: 'campus',
        prayerSpaceId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledTime: pastDate,
      });
      expect(result.success).toBe(false);
    });

    it('should reject campus location without prayer space ID', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'dhuhr',
        locationType: 'campus',
        scheduledTime: futureDate,
      });
      expect(result.success).toBe(false);
    });

    it('should reject current location without coordinates', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'dhuhr',
        locationType: 'current',
        scheduledTime: futureDate,
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes over 500 characters', () => {
      const longNotes = 'a'.repeat(501);
      const result = createSessionSchema.safeParse({
        prayerType: 'dhuhr',
        locationType: 'campus',
        prayerSpaceId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledTime: futureDate,
        notes: longNotes,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept valid display name', () => {
      const result = updateProfileSchema.safeParse({ displayName: 'John Doe' });
      expect(result.success).toBe(true);
    });

    it('should reject name under 2 characters', () => {
      const result = updateProfileSchema.safeParse({ displayName: 'J' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 50 characters', () => {
      const result = updateProfileSchema.safeParse({ displayName: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('should reject name with numbers', () => {
      const result = updateProfileSchema.safeParse({ displayName: 'John123' });
      expect(result.success).toBe(false);
    });

    it('should accept name with hyphens and apostrophes', () => {
      const result = updateProfileSchema.safeParse({ displayName: "Mary-Jane O'Connor" });
      expect(result.success).toBe(true);
    });
  });

  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = ['+1234567890', '+14155552671', '12025551234'];
      validPhones.forEach((phone) => {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['abc', '0123456789', '+', '']; // non-numeric, starts with 0, just +, empty
      invalidPhones.forEach((phone) => {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('getZodErrors', () => {
    it('should extract error messages by path', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'invalid',
        locationType: 'campus',
        scheduledTime: new Date(),
      });

      if (!result.success) {
        const errors = getZodErrors(result.error);
        expect(errors).toHaveProperty('prayerType');
      }
    });
  });

  describe('getFirstZodError', () => {
    it('should return the first error message', () => {
      const result = createSessionSchema.safeParse({
        prayerType: 'invalid',
        locationType: 'campus',
        scheduledTime: new Date(),
      });

      if (!result.success) {
        const errorMessage = getFirstZodError(result.error);
        expect(typeof errorMessage).toBe('string');
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });
  });
});
