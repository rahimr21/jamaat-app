import { View, Pressable } from 'react-native';
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
}

const variantStyles = {
  default: 'bg-gray-50',
  elevated: 'bg-white shadow-md',
  outlined: 'bg-white border border-gray-200',
};

export function Card({
  children,
  onPress,
  className = '',
  variant = 'default',
}: CardProps) {
  const baseClasses = `rounded-xl p-4 ${variantStyles[variant]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        className={`${baseClasses} active:opacity-90`}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClasses}>{children}</View>;
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`flex-row items-center justify-between mb-3 ${className}`}>
      {children}
    </View>
  );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`flex-row items-center justify-end mt-4 pt-3 border-t border-gray-100 ${className}`}>
      {children}
    </View>
  );
}
