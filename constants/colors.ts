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
