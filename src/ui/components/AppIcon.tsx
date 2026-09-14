import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, size = 24, color }) => {
  const { colors } = useTheme();
  const iconColor = color ?? colors.primaryText;

  // Map custom keys to Ionicons
  let mappedName = name as keyof typeof Ionicons.glyphMap;
  switch (name) {
    case 'laptop':
      mappedName = 'laptop-outline';
      break;
    case 'book':
      mappedName = 'book-outline';
      break;
    case 'heart':
      mappedName = 'heart-outline';
      break;
    case 'trending-up':
      mappedName = 'trending-up-outline';
      break;
    case 'fitness':
      mappedName = 'barbell-outline';
      break;
    case 'sparkles':
      mappedName = 'sparkles-outline';
      break;
    case 'cafe':
      mappedName = 'cafe-outline';
      break;
    case 'moon':
      mappedName = 'moon-outline';
      break;
    case 'sun':
      mappedName = 'sunny-outline';
      break;
    case 'hourglass':
      mappedName = 'hourglass-outline';
      break;
    case 'target':
      mappedName = 'radio-button-on-outline';
      break;
    case 'play':
      mappedName = 'play';
      break;
    case 'pause':
      mappedName = 'pause';
      break;
    case 'stop':
      mappedName = 'stop';
      break;
    case 'check':
      mappedName = 'checkmark';
      break;
    case 'close':
      mappedName = 'close';
      break;
    case 'add':
      mappedName = 'add';
      break;
    case 'settings':
      mappedName = 'settings-outline';
      break;
    case 'calendar':
      mappedName = 'calendar-outline';
      break;
    case 'stats':
      mappedName = 'stats-chart-outline';
      break;
    case 'time':
      mappedName = 'time-outline';
      break;
    case 'chevron-down':
      mappedName = 'chevron-down-outline';
      break;
    case 'chevron-up':
      mappedName = 'chevron-up-outline';
      break;
    case 'chevron-back':
      mappedName = 'chevron-back-outline';
      break;
    case 'chevron-forward':
      mappedName = 'chevron-forward-outline';
      break;
    case 'briefcase':
      mappedName = 'briefcase-outline';
      break;
    case 'restaurant':
      mappedName = 'restaurant-outline';
      break;
    case 'people':
      mappedName = 'people-outline';
      break;
    case 'shield':
      mappedName = 'shield-checkmark-outline';
      break;
    case 'bed':
      mappedName = 'bed-outline';
      break;
    case 'bag':
      mappedName = 'bag-handle-outline';
      break;
    case 'barbell':
      mappedName = 'barbell-outline';
      break;
    case 'reorder':
      mappedName = 'reorder-two-outline';
      break;
    case 'quote':
      mappedName = 'chatbubble-ellipses-outline';
      break;
    case 'person':
      mappedName = 'person-circle-outline';
      break;
    case 'home':
      mappedName = 'home-outline';
      break;
    case 'plan':
    case 'checkbox':
      mappedName = 'checkbox-outline';
      break;
  }

  return <Ionicons name={mappedName} size={size} color={iconColor} />;
};
