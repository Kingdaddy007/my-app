import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/ThemeContext';
import { useApp } from '../../src/data/AppContext';
import { AppIcon } from '../../src/ui/components/AppIcon';
import { radii, typography } from '../../src/ui/tokens';

export default function TabsLayout() {
  const { colors, mode } = useTheme();
  const { sleeping } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (sleeping) router.replace('/(tabs)');
  }, [sleeping, router]);

  const isDark = mode === 'dark';
  const chrome = sleeping ? '#12182A' : isDark ? 'rgba(16, 23, 34, 0.97)' : 'rgba(251, 249, 245, 0.97)';

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
            marginBottom: 2,
            flexWrap: 'wrap',
          },
        ],
        tabBarItemStyle: {
          height: 62,
          paddingVertical: 2,
        },
        tabBarStyle: {
          display: sleeping ? 'none' : 'flex',
          position: 'relative',
          height: 76 + Math.max(insets.bottom, 6),
          marginHorizontal: 14,
          marginBottom: Math.max(insets.bottom, 8),
          borderRadius: 24,
          backgroundColor: chrome,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: sleeping ? '#818CF8' : colors.border,
          ...(Platform.OS === 'web'
            ? { boxShadow: isDark ? '0 6px 16px rgba(0,0,0,0.40)' : '0 6px 16px rgba(35,39,58,0.10)' }
            : {
                shadowColor: colors.cardShadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.4 : 0.1,
                shadowRadius: 16,
                elevation: 6,
              }),
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name="home" size={22} color={color as string} />
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
              <AppIcon name="plan" size={22} color={color as string} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: 'Circle',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.actionSubtle }]}>
              <AppIcon name="people" size={22} color={color as string} />
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
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
