// Location utility functions

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "500m" or "1.5 mi")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Check if a location is within a radius of another location
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusMeters;
}

/**
 * Default location (Boston) for fallback
 */
export const DEFAULT_LOCATION = {
  latitude: 42.3601,
  longitude: -71.0589,
};
