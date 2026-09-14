import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, typography } from '../tokens';
import { ThemeColors } from '../tokens';

interface ErrorStateProps {
  colors: ThemeColors;
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

/**
 * Durable error boundary UI: explicit loading failure with retry, so a dead
 * database can never present as an infinite blank screen.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  colors,
  title = 'Something needs attention',
  message,
  onRetry,
  retryLabel = 'Retry',
}) => (
  <View
    style={[styles.wrap, { backgroundColor: colors.canvas, borderColor: colors.border }]}
    accessible={true}
    accessibilityRole="alert"
    accessibilityLabel={`${title}. ${message}`}
  >
    <Text style={[typography.title, { color: colors.primaryText }]}>{title}</Text>
    <Text style={[typography.body, { color: colors.secondaryText, marginTop: 8 }]}>{message}</Text>
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={retryLabel}
      accessibilityHint="Retries loading local data"
      style={({ pressed }) => [
        styles.retry,
        { backgroundColor: colors.primaryAction, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[typography.bodyMedium, { color: colors.onPrimaryAction, fontWeight: '700' }]}>
        {retryLabel}
      </Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 20,
    margin: 20,
    gap: 4,
  },
  retry: {
    minHeight: 48,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});
