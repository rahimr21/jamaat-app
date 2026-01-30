// Updated to use Jamaat brand colors
const tintColorLight = '#28A745'; // Primary green
const tintColorDark = '#66BB6A'; // Primary 400

export default {
  light: {
    text: '#212529', // gray-900
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#ADB5BD', // gray-500
    tabIconSelected: tintColorLight,
    surface: '#F8F9FA', // gray-50
    border: '#DEE2E6', // gray-300
    textSecondary: '#6C757D', // gray-600
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A1D1F',
    tint: tintColorDark,
    tabIconDefault: '#6C737A',
    tabIconSelected: tintColorDark,
    surface: '#25282B',
    border: '#3A3F45',
    textSecondary: '#ADB5BD',
  },
};
