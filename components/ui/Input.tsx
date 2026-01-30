import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useState } from 'react';

export interface InputProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  editable = true,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return 'border-red-500';
    if (isFocused) return 'border-primary-500';
    return 'border-gray-300';
  };

  const inputContainerClasses = [
    'flex-row items-center border rounded-lg px-4',
    getBorderColor(),
    !editable ? 'bg-gray-50' : 'bg-white',
  ].join(' ');

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">
          {label}
        </Text>
      )}

      <View className={inputContainerClasses}>
        {leftIcon && <View className="mr-3">{leftIcon}</View>}

        <TextInput
          className="flex-1 py-3 text-base text-gray-900"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable}
          {...props}
        />

        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>

      {error && (
        <Text className="text-sm text-red-500 mt-1">{error}</Text>
      )}

      {hint && !error && (
        <Text className="text-sm text-gray-500 mt-1">{hint}</Text>
      )}
    </View>
  );
}

export interface TextAreaProps extends Omit<InputProps, 'multiline'> {
  rows?: number;
}

export function TextArea({ rows = 4, ...props }: TextAreaProps) {
  return (
    <Input
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      style={{ minHeight: rows * 24 }}
      {...props}
    />
  );
}
