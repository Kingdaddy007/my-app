import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'raised' | 'warm' | 'subtle';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
  padding = spacing.cardPadding,
}) => {
  const { colors, mode } = useTheme();

  let backgroundColor = colors.surface;
  let borderColor = colors.borderSubtle;

  if (variant === 'raised') {
    backgroundColor = colors.surfaceRaised;
    borderColor = colors.border;
  } else if (variant === 'warm') {
    backgroundColor = colors.warmGapSurface;
    borderColor = colors.warmGapBorder;
  } else if (variant === 'subtle') {
    backgroundColor = colors.surfaceSubtle;
    borderColor = 'transparent';
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
          padding,
          shadowColor: colors.cardShadow,
          shadowOpacity: mode === 'dark' ? 0.3 : 0.08,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
});
