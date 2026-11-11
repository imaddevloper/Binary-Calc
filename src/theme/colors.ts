/**
 * Design tokens. The visual direction follows the supplied icon: near-black
 * surfaces with a crimson accent. `primary` is the fill used for buttons (white
 * text on it passes AA); `accent` is the tint used for text/icons on surfaces.
 */
export interface Palette {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  textSecondary: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  secondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  errorSoft: string;
  disabled: string;
  overlay: string;
  isDark: boolean;
}

export const lightPalette: Palette = {
  background: '#F6F5F7',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  text: '#16161D',
  textSecondary: '#5E5E6B',
  primary: '#D91E2B',
  onPrimary: '#FFFFFF',
  accent: '#C8101F',
  accentSoft: '#FDECEE',
  secondary: '#3F4A5E',
  border: '#E3E1E6',
  success: '#15803D',
  warning: '#A15C07',
  error: '#B42318',
  errorSoft: '#FEF0EE',
  disabled: '#A9A8B3',
  overlay: 'rgba(16,16,22,0.45)',
  isDark: false,
};

export const darkPalette: Palette = {
  background: '#0B0B0F',
  surface: '#14141A',
  elevated: '#1C1C24',
  text: '#F5F5F7',
  textSecondary: '#A6A6B4',
  primary: '#D91E2B',
  onPrimary: '#FFFFFF',
  accent: '#FF6B75',
  accentSoft: '#2A1217',
  secondary: '#9AA6BD',
  border: '#2A2A34',
  success: '#4CCB91',
  warning: '#F0BC62',
  error: '#FF9A8A',
  errorSoft: '#2E1816',
  disabled: '#6A6A78',
  overlay: 'rgba(0,0,0,0.62)',
  isDark: true,
};

export type ThemeName = 'light' | 'dark';
export type ThemeMode = ThemeName | 'system';

export const palettes: Record<ThemeName, Palette> = { light: lightPalette, dark: darkPalette };
