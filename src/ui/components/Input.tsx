import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing, typography } from '../tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  maxLength,
  value,
  style,
  ...rest
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            typography.metadata,
            styles.label,
            { color: error ? colors.danger : colors.secondaryText },
          ]}
        >
          {label}
        </Text>
      )}

      <TextInput
        value={value}
        maxLength={maxLength}
        placeholderTextColor={colors.mutedText}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.surfaceRaised,
            color: colors.primaryText,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
        {...rest}
      />

      <View style={styles.footerRow}>
        {error ? (
          <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
        ) : helperText ? (
          <Text style={[typography.caption, { color: colors.secondaryText }]}>{helperText}</Text>
        ) : (
          <View />
        )}

        {maxLength && (
          <Text style={[typography.metadata, { color: colors.mutedText }]}>
            {value?.length ?? 0}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: spacing.touchTargetMin,
    borderRadius: radii.control,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
