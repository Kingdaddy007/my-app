import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/ThemeContext';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { radii, typography } from '../../src/ui/tokens';

export default function TabsLayout() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const isDark = mode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primaryAction,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: [
          typography.metadata,
          {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 4,
          },
        ],
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(12, insets.bottom + 4),
          left: 20,
          right: 20,
          height: 64,
          borderRadius: radii.pill,
          backgroundColor: isDark ? 'rgba(22, 34, 41, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 16,
          elevation: 6,
          paddingBottom: 4,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name={focused ? 'sun' : 'sun'} size={22} color={color as string} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name="time" size={22} color={color as string} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name="stats" size={22} color={color as string} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
