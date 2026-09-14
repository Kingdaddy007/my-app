/**
 * AEVIA Semantic Tokens & Design System Values
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
  canvas: '#F3F0EA',
  surface: '#FBF9F5',
  surfaceRaised: '#FFFFFF',
  surfaceSubtle: '#ECEAF1',
  primaryText: '#171A24',
  secondaryText: '#5E6270',
  mutedText: '#858A98',
  primaryAction: '#5967D9',
  onPrimaryAction: '#FFFFFF',
  actionSubtle: '#E6E9FF',
  warmGapSurface: '#FFF1DE',
  warmGapText: '#6E400F',
  warmGapBorder: '#E8A45C',
  border: '#D6D3D0',
  borderSubtle: '#E6E2DE',
  cardShadow: 'rgba(24, 27, 39, 0.08)',
  haloGlow: 'rgba(89, 103, 217, 0.24)',
  haloTrack: '#DDDCE5',
  haloAccent: '#5967D9',
  danger: '#C94B58',
  success: '#5967D9',
  amber: '#D98534',
  skyGradientTop: '#DCE3F0',
  skyGradientBottom: '#F5D2B4',
  mountainFar: '#ADB4C3',
  mountainMid: '#7B8194',
  mountainNear: '#4E5368',
  mountainForeground: '#292D3E',
  sunDisc: '#E9894A',
  sunGlow: 'rgba(233, 137, 74, 0.34)',
};

export const darkTheme: ThemeColors = {
  canvas: '#080C14',
  surface: '#101722',
  surfaceRaised: '#182131',
  surfaceSubtle: '#0D131E',
  primaryText: '#F3F4F8',
  secondaryText: '#AEB5C5',
  mutedText: '#778092',
  primaryAction: '#91A7FF',
  onPrimaryAction: '#0B1020',
  actionSubtle: '#202A49',
  warmGapSurface: '#302216',
  warmGapText: '#F4C47D',
  warmGapBorder: '#72502E',
  border: '#2A3447',
  borderSubtle: '#1D2636',
  cardShadow: 'rgba(0, 0, 0, 0.42)',
  haloGlow: 'rgba(145, 167, 255, 0.32)',
  haloTrack: '#242D40',
  haloAccent: '#91A7FF',
  danger: '#FF7A86',
  success: '#91A7FF',
  amber: '#F0B45D',
  skyGradientTop: '#080D19',
  skyGradientBottom: '#242840',
  mountainFar: '#252B40',
  mountainMid: '#1A2033',
  mountainNear: '#111827',
  mountainForeground: '#090E18',
  sunDisc: '#FFAD68',
  sunGlow: 'rgba(255, 173, 104, 0.30)',
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
