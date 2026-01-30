// Spacing system per FRONTEND_DESIGN
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const spacingPresets = {
  containerPadding: spacing[4],
  cardPadding: spacing[4],
  sectionSpacing: spacing[6],
  stackSpacing: spacing[3],
  inlineSpacing: spacing[2],
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type SpacingPresets = typeof spacingPresets;
export type BorderRadius = typeof borderRadius;
