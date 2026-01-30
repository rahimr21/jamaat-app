import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { ReactNode } from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  children: ReactNode;
}

const variantStyles = {
  primary: {
    container: 'bg-primary-500 active:bg-primary-600',
    containerDisabled: 'bg-gray-400',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-gray-100 active:bg-gray-200',
    containerDisabled: 'bg-gray-100',
    text: 'text-gray-900',
    textDisabled: 'text-gray-400',
  },
  outline: {
    container: 'border border-primary-500 bg-transparent active:bg-primary-50',
    containerDisabled: 'border border-gray-300 bg-transparent',
    text: 'text-primary-500',
    textDisabled: 'text-gray-400',
  },
  ghost: {
    container: 'bg-transparent active:bg-gray-100',
    containerDisabled: 'bg-transparent',
    text: 'text-gray-700',
    textDisabled: 'text-gray-400',
  },
};

const sizeStyles = {
  sm: {
    container: 'py-2 px-3',
    text: 'text-sm',
  },
  md: {
    container: 'py-3 px-4',
    text: 'text-base',
  },
  lg: {
    container: 'py-4 px-6',
    text: 'text-lg',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  onPress,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const containerClasses = [
    'flex-row items-center justify-center rounded-xl',
    sizeStyle.container,
    isDisabled ? variantStyle.containerDisabled : variantStyle.container,
    fullWidth ? 'w-full' : '',
  ].join(' ');

  const textClasses = [
    'font-semibold',
    sizeStyle.text,
    isDisabled ? (variantStyle.textDisabled || 'text-white') : variantStyle.text,
  ].join(' ');

  return (
    <Pressable
      className={containerClasses}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : '#6C757D'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={textClasses}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}
