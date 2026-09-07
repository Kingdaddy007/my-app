/**
 * VIGIL Semantic Tokens & Design System Values
 * Formulated from docs/DESIGN.md and calibrated against the 3 original mockups.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  surfaceSubtle: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  primaryAction: string;
  onPrimaryAction: string;
  actionSubtle: string;
  warmGapSurface: string;
  warmGapText: string;
  warmGapBorder: string;
  border: string;
  borderSubtle: string;
  cardShadow: string;
  haloGlow: string;
  haloTrack: string;
  haloAccent: string;
  danger: string;
  success: string;
  amber: string;
  skyGradientTop: string;
  skyGradientBottom: string;
  mountainFar: string;
  mountainMid: string;
  mountainNear: string;
  mountainForeground: string;
  sunDisc: string;
  sunGlow: string;
}

export const lightTheme: ThemeColors = {
  canvas: '#F4F6F5',
  surface: '#FFFFFF',
  surfaceRaised: '#EAF0ED',
  surfaceSubtle: '#F0F4F2',
  primaryText: '#142821',
  secondaryText: '#50645B',
  mutedText: '#7B8F86',
  primaryAction: '#087A59',
  onPrimaryAction: '#FFFFFF',
  actionSubtle: '#DFF4EC',
  warmGapSurface: '#FFF1D9',
  warmGapText: '#714900',
  warmGapBorder: '#F5C77D',
  border: '#CFDAD4',
  borderSubtle: '#E4ECE8',
  cardShadow: 'rgba(20, 40, 33, 0.06)',
  haloGlow: 'rgba(8, 122, 89, 0.25)',
  haloTrack: '#E1E9E4',
  haloAccent: '#087A59',
  danger: '#DC2626',
  success: '#087A59',
  amber: '#D97706',
  skyGradientTop: '#E6EFF2',
  skyGradientBottom: '#FDEBD4',
  mountainFar: '#9CB7B4',
  mountainMid: '#5C8681',
  mountainNear: '#355D57',
  mountainForeground: '#1A3F39',
  sunDisc: '#FDBA74',
  sunGlow: 'rgba(251, 146, 60, 0.35)',
};

export const darkTheme: ThemeColors = {
  canvas: '#0C141A',
  surface: '#162229',
  surfaceRaised: '#1D2C33',
  surfaceSubtle: '#141E24',
  primaryText: '#F2F7F4',
  secondaryText: '#ADBBB4',
  mutedText: '#7A8C84',
  primaryAction: '#55DEAE',
  onPrimaryAction: '#082A20',
  actionSubtle: '#17362C',
  warmGapSurface: '#382C1D',
  warmGapText: '#F5C77D',
  warmGapBorder: '#634A26',
  border: '#35474B',
  borderSubtle: '#253538',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  haloGlow: 'rgba(85, 222, 174, 0.30)',
  haloTrack: '#203239',
  haloAccent: '#55DEAE',
  danger: '#F87171',
  success: '#55DEAE',
  amber: '#F59E0B',
  skyGradientTop: '#080E13',
  skyGradientBottom: '#1B242D',
  mountainFar: '#1A2930',
  mountainMid: '#122026',
  mountainNear: '#0E191E',
  mountainForeground: '#091115',
  sunDisc: '#FB923C',
  sunGlow: 'rgba(251, 146, 60, 0.28)',
};

export const typography = {
  timer: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  metadata: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
};

export const spacing = {
  pageGutter: 20,
  sectionGap: 24,
  cardPadding: 18,
  itemGap: 12,
  touchTargetMin: 48,
};

export const radii = {
  card: 24,
  sheet: 28,
  control: 16,
  pill: 999,
  thumb: 8,
};
