import {
  calculateDistance,
  DEFAULT_LOCATION,
  formatDistance,
  isWithinRadius,
  metersToMiles,
  milesToMeters,
} from './location';

describe('location utilities', () => {
  describe('formatDistance', () => {
    it('should format meters for short distances', () => {
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(100)).toBe('100m');
      expect(formatDistance(999)).toBe('999m');
    });

    it('should format miles for longer distances', () => {
      expect(formatDistance(1609.34)).toBe('1.0 mi');
      expect(formatDistance(3218.68)).toBe('2.0 mi');
      expect(formatDistance(8046.7)).toBe('5.0 mi');
    });

    it('should round meters to nearest whole number', () => {
      expect(formatDistance(500.7)).toBe('501m');
      expect(formatDistance(500.3)).toBe('500m');
    });

    it('should round miles to one decimal place', () => {
      expect(formatDistance(2500)).toBe('1.6 mi');
    });
  });

  describe('calculateDistance', () => {
    // Boston coordinates
    const bostonLat = 42.3601;
    const bostonLng = -71.0589;

    // Cambridge coordinates (about 5km from Boston)
    const cambridgeLat = 42.3736;
    const cambridgeLng = -71.1097;

    it('should return 0 for same location', () => {
      const distance = calculateDistance(bostonLat, bostonLng, bostonLat, bostonLng);
      expect(distance).toBe(0);
    });

    it('should calculate distance between two points', () => {
      const distance = calculateDistance(bostonLat, bostonLng, cambridgeLat, cambridgeLng);
      // Should be approximately 5000 meters (5km)
      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(6000);
    });

    it('should return same distance regardless of order', () => {
      const distance1 = calculateDistance(bostonLat, bostonLng, cambridgeLat, cambridgeLng);
      const distance2 = calculateDistance(cambridgeLat, cambridgeLng, bostonLat, bostonLng);
      expect(Math.abs(distance1 - distance2)).toBeLessThan(1);
    });
  });

  describe('metersToMiles', () => {
    it('should convert meters to miles', () => {
      expect(metersToMiles(1609.34)).toBeCloseTo(1, 1);
      expect(metersToMiles(3218.68)).toBeCloseTo(2, 1);
    });
  });

  describe('milesToMeters', () => {
    it('should convert miles to meters', () => {
      expect(milesToMeters(1)).toBeCloseTo(1609.34, 0);
      expect(milesToMeters(2)).toBeCloseTo(3218.68, 0);
    });
  });

  describe('isWithinRadius', () => {
    const centerLat = 42.3601;
    const centerLng = -71.0589;

    it('should return true for point within radius', () => {
      // Point very close to center
      const result = isWithinRadius(centerLat, centerLng, 42.3605, -71.0585, 1000);
      expect(result).toBe(true);
    });

    it('should return false for point outside radius', () => {
      // Point far from center
      const result = isWithinRadius(centerLat, centerLng, 42.5, -71.5, 1000);
      expect(result).toBe(false);
    });

    it('should return true for same point', () => {
      const result = isWithinRadius(centerLat, centerLng, centerLat, centerLng, 1000);
      expect(result).toBe(true);
    });
  });

  describe('DEFAULT_LOCATION', () => {
    it('should have Boston coordinates', () => {
      expect(DEFAULT_LOCATION.latitude).toBeCloseTo(42.3601, 4);
      expect(DEFAULT_LOCATION.longitude).toBeCloseTo(-71.0589, 4);
    });
  });
});
