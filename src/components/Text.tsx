import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { textStyles } from '../theme/typography';
import type { TextVariant } from '../theme/typography';
import { useI18n } from '../hooks/useI18n';
import { ltr } from '../i18n';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: 'text' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'onPrimary';
  align?: TextStyle['textAlign'];
}

/** Themed text. Font scaling is left ON so Android font-size settings are respected. */
export function AppText({ variant = 'body', color = 'text', align, style, children, ...rest }: Props) {
  const { colors } = useTheme();
  const c =
    color === 'secondary' ? colors.textSecondary :
    color === 'accent' ? colors.accent :
    color === 'success' ? colors.success :
    color === 'warning' ? colors.warning :
    color === 'error' ? colors.error :
    color === 'onPrimary' ? colors.onPrimary :
    colors.text;
  return (
    <RNText {...rest} style={[textStyles[variant], { color: c }, align ? { textAlign: align } : null, style]}>
      {children}
    </RNText>
  );
}

interface MonoProps extends Omit<Props, 'variant'> {
  large?: boolean;
  children: string | number;
  selectable?: boolean;
}

/**
 * Technical values (IPs, binary, hex, formulas): monospaced, always left-to-right,
 * isolated with bidi marks so Arabic text around them can't reorder them.
 */
export function Mono({ large, color = 'text', style, children, ...rest }: MonoProps) {
  const { isRTL } = useI18n();
  return (
    <AppText
      {...rest}
      variant={large ? 'monoLarge' : 'mono'}
      color={color}
      style={[{ writingDirection: 'ltr', textAlign: isRTL ? 'right' : 'left' }, style]}
    >
      {ltr(children)}
    </AppText>
  );
}
