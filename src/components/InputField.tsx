import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, TOUCH } from '../theme/spacing';
import { fonts } from '../theme/typography';
import { AppText } from './Text';
import { IconButton } from './Buttons';
import { ErrorMessage } from './Feedback';
import { useI18n } from '../hooks/useI18n';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'characters';
  error?: string | null;
  helper?: string;
  onSubmit?: () => void;
  /** Optional paste button next to clear. */
  onPaste?: () => void;
  maxLength?: number;
}

/** Labeled technical input: monospaced, always LTR, clear (and optional paste) buttons, error text below. */
export function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'none', error, helper, onSubmit, onPaste, maxLength }: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="secondary">{label}</AppText>
      <View style={[styles.box, { backgroundColor: colors.background, borderColor: border, borderWidth: focused || error ? 2 : 1 }]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={maxLength}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.text, fontFamily: fonts.mono, textAlign: isRTL ? 'right' : 'left', writingDirection: 'ltr' }]}
        />
        {onPaste ? <IconButton icon="clipboard" label={t('a11y.pasteField')} onPress={onPaste} size={20} color={colors.textSecondary} /> : null}
        {value.length > 0 ? <IconButton icon="close-circle" label={t('a11y.clearField')} onPress={() => onChangeText('')} size={20} color={colors.textSecondary} /> : null}
      </View>
      <ErrorMessage message={error} />
      {!error && helper ? <AppText variant="caption" color="secondary">{helper}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingStart: spacing.md, paddingEnd: spacing.xs, minHeight: TOUCH + 4 },
  input: { flex: 1, fontSize: 18, paddingVertical: spacing.sm },
});
