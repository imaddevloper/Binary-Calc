import React, { useRef } from 'react';
import { View } from 'react-native';
import { IconButton } from './Buttons';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../hooks/useI18n';

/** Measures its own centre in window coordinates so the reveal circle starts exactly under the button. */
export function ThemeToggle() {
  const { name, toggleTheme, colors } = useTheme();
  const { t } = useI18n();
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  const onPress = () => {
    if (!ref.current) return;
    ref.current.measureInWindow((x, y, w, h) => toggleTheme({ x: x + w / 2, y: y + h / 2 }));
  };

  return (
    <IconButton
      ref={ref}
      icon={name === 'dark' ? 'sunny' : 'moon'}
      color={colors.text}
      label={name === 'dark' ? t('a11y.toLight') : t('a11y.toDark')}
      onPress={onPress}
    />
  );
}
