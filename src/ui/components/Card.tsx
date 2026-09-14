import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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

  const shadowStyle: ViewStyle =
    Platform.OS === 'web'
      ? { boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.30)' : '0 4px 12px rgba(20,40,33,0.08)' }
      : {
          shadowColor: colors.cardShadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: mode === 'dark' ? 0.3 : 0.08,
          shadowRadius: 12,
          elevation: 2,
        };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
          padding,
        },
        shadowStyle,
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
  },
});
