import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/ui/ThemeContext';
import { AppProvider, useApp } from '../src/data/AppContext';
import { configureNotifications, registerNotificationTapRouter } from '../src/platform/notifications';

function RootNav() {
  const router = useRouter();
  const { mode, colors, preference, setPreference, reducedMotion, setReducedMotion } = useTheme();
  const { isReady, settings } = useApp();

  useEffect(() => {
    configureNotifications();
    let dispose: (() => void) | undefined;
    void registerNotificationTapRouter(
      () => '/(tabs)',
      (route) => router.push(route as never)
    ).then((cleanup) => {
      dispose = cleanup;
    });
    return () => dispose?.();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (settings.themePreference !== preference) setPreference(settings.themePreference);
    if (settings.reducedMotion !== reducedMotion) setReducedMotion(settings.reducedMotion);
  }, [isReady, preference, reducedMotion, setPreference, setReducedMotion, settings]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: reducedMotion ? 'fade' : 'default',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="activities"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="preview"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <RootNav />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
