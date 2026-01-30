// Color palette per FRONTEND_DESIGN
export const colors = {
  // Primary (Islamic green)
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#28A745',
    600: '#1E7B34',
    700: '#166129',
    800: '#0F471F',
    900: '#082D14',
    DEFAULT: '#28A745',
  },

  // Neutrals
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
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
} as const;

export type Colors = typeof colors;

// Legacy Colors export for backward compatibility with existing components
const themeColors = {
  light: {
    text: colors.gray[900],
    background: colors.background,
    tint: colors.primary[500],
    tabIconDefault: colors.gray[500],
    tabIconSelected: colors.primary[500],
    surface: colors.surface,
    border: colors.gray[300],
    textSecondary: colors.gray[600],
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A1D1F',
    tint: colors.primary[400],
    tabIconDefault: '#6C737A',
    tabIconSelected: colors.primary[400],
    surface: '#25282B',
    border: '#3A3F45',
    textSecondary: colors.gray[500],
  },
};

export default themeColors;
