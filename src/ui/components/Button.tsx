import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing, typography } from '../tokens';
import { triggerHaptic } from '../../platform/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'circle';

interface ButtonProps {
  label?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  size = 'medium',
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic('light');
    onPress();
  };

  // Base heights & padding
  let minHeight = spacing.touchTargetMin; // >= 48dp
  let paddingHorizontal = 20;
  let fontSize = typography.bodyMedium.fontSize;

  if (size === 'small') {
    minHeight = 44;
    paddingHorizontal = 14;
    fontSize = typography.caption.fontSize;
  } else if (size === 'large') {
    minHeight = 56;
    paddingHorizontal = 24;
    fontSize = typography.sectionTitle.fontSize;
  }

  // Variant styling
  let backgroundColor = colors.primaryAction;
  let textColor = colors.onPrimaryAction;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'secondary') {
    backgroundColor = colors.surfaceRaised;
    textColor = colors.primaryText;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = colors.primaryText;
    borderColor = colors.border;
    borderWidth = 1.5;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = colors.secondaryText;
  } else if (variant === 'danger') {
    backgroundColor = colors.danger;
    textColor = '#FFFFFF';
  } else if (variant === 'circle') {
    backgroundColor = colors.primaryAction;
    textColor = colors.onPrimaryAction;
    paddingHorizontal = 0;
  }

  if (disabled) {
    backgroundColor = colors.surfaceRaised;
    textColor = colors.mutedText;
    borderColor = 'transparent';
  }

  const isCircle = variant === 'circle';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          minHeight,
          minWidth: isCircle ? minHeight : undefined,
          borderRadius: isCircle ? minHeight / 2 : radii.control,
          paddingHorizontal: isCircle ? 0 : paddingHorizontal,
          opacity: pressed && !disabled ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={label ? styles.iconMargin : undefined}>{icon}</View>}
          {label && (
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: textColor,
                  fontSize,
                  fontWeight: '600',
                  textAlign: 'center',
                },
              ]}
              maxFontSizeMultiplier={1.5}
            >
              {label}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginRight: 8,
  },
});
