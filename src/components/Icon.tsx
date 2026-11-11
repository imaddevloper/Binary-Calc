import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

/** One icon family (Ionicons outline) so stroke weight and optical size stay consistent. */
export type IconName =
  | 'home' | 'calculator' | 'globe' | 'school' | 'time' | 'settings' | 'camera' | 'image'
  | 'copy' | 'close-circle' | 'chevron-back' | 'chevron-forward' | 'help-circle' | 'sunny' | 'moon'
  | 'language' | 'trash' | 'checkmark-circle' | 'alert-circle' | 'clipboard' | 'refresh' | 'flash'
  | 'flash-off' | 'logo-instagram' | 'bulb' | 'trophy' | 'swap-horizontal' | 'bookmark' | 'shield-checkmark'
  | 'repeat' | 'create' | 'chevron-down' | 'chevron-up' | 'phone-portrait' | 'arrow-back' | 'arrow-forward';

const OUTLINE: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  calculator: 'calculator-outline',
  globe: 'globe-outline',
  school: 'school-outline',
  time: 'time-outline',
  settings: 'settings-outline',
  camera: 'camera-outline',
  image: 'image-outline',
  copy: 'copy-outline',
  'close-circle': 'close-circle-outline',
  'chevron-back': 'chevron-back',
  'chevron-forward': 'chevron-forward',
  'help-circle': 'help-circle-outline',
  sunny: 'sunny-outline',
  moon: 'moon-outline',
  language: 'language-outline',
  trash: 'trash-outline',
  'checkmark-circle': 'checkmark-circle-outline',
  'alert-circle': 'alert-circle-outline',
  clipboard: 'clipboard-outline',
  refresh: 'refresh-outline',
  flash: 'flash-outline',
  'flash-off': 'flash-off-outline',
  'logo-instagram': 'logo-instagram',
  bulb: 'bulb-outline',
  trophy: 'trophy-outline',
  'swap-horizontal': 'swap-horizontal-outline',
  bookmark: 'bookmark-outline',
  'shield-checkmark': 'shield-checkmark-outline',
  repeat: 'repeat-outline',
  create: 'create-outline',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  'phone-portrait': 'phone-portrait-outline',
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color }: Props) {
  const { colors } = useTheme();
  return <Ionicons name={OUTLINE[name]} size={size} color={color ?? colors.text} accessibilityElementsHidden importantForAccessibility="no" />;
}
