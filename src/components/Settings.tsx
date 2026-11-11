import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Card } from './Card';
import { AppText } from './Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../hooks/useI18n';
import { spacing, TOUCH } from '../theme/spacing';

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">{title}</AppText>
      {children}
    </Card>
  );
}

export function SwitchRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="subheading">{label}</AppText>
        {description ? <AppText variant="caption" color="secondary">{description}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function ActionRow({ icon, label, description, onPress }: { icon: IconName; label: string; description?: string; onPress: () => void }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      onPress={onPress}
      style={styles.row}
    >
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.flex}>
        <AppText variant="subheading">{label}</AppText>
        {description ? <AppText variant="caption" color="secondary">{description}</AppText> : null}
      </View>
      <Icon name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH + 4 },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
