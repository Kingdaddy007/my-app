import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, ThemeColors, ThemeMode } from './tokens';
import { ThemePreference } from '../domain/types';

interface ThemeContextType {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: ThemeColors;
  setPreference: (pref: ThemePreference) => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  preference: 'system',
  colors: darkTheme,
  setPreference: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialPreference?: ThemePreference;
  initialReducedMotion?: boolean;
}> = ({ children, initialPreference = 'system', initialReducedMotion = false }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const [reducedMotion, setReducedMotion] = useState<boolean>(initialReducedMotion);

  const resolvedMode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const colors = resolvedMode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        mode: resolvedMode,
        preference,
        colors,
        setPreference,
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
