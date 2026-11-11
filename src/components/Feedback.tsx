import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/spacing';
import { AppText } from './Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { DirectionView, useI18n } from '../hooks/useI18n';

/** Error text with an icon, so errors never rely on color alone. */
export function ErrorMessage({ message }: { message: string | null | undefined }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.row}>
      <Icon name="alert-circle" size={18} color={colors.error} />
      <AppText variant="caption" color="error" style={styles.flex} accessibilityLabel={`${t('a11y.error')}: ${message}`}>
        {message}
      </AppText>
    </View>
  );
}

export function InfoMessage({ message, tone = 'secondary' }: { message: string; tone?: 'secondary' | 'success' | 'warning' }) {
  const { colors } = useTheme();
  const iconColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={styles.row}>
      <Icon name={tone === 'success' ? 'checkmark-circle' : 'bulb'} size={18} color={iconColor} />
      <AppText variant="caption" color={tone === 'secondary' ? 'secondary' : tone} style={styles.flex}>{message}</AppText>
    </View>
  );
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={30} color={colors.accent} />
      </View>
      <AppText variant="subheading" align="center">{title}</AppText>
      <AppText variant="body" color="secondary" align="center">{description}</AppText>
      {actionLabel && onAction ? <SecondaryButton label={actionLabel} onPress={onAction} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}

export function LoadingIndicator({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <AppText variant="body" color="secondary" align="center">{label}</AppText> : null}
    </View>
  );
}

interface DialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({ visible, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: DialogProps) {
  const { colors } = useTheme();
  useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
      <DirectionView>
        <Pressable accessibilityLabel={cancelLabel} onPress={onCancel} style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <Pressable
            accessibilityViewIsModal
            onPress={() => {}}
            style={[styles.dialog, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          >
            <AppText variant="heading">{title}</AppText>
            <AppText variant="body" color="secondary">{body}</AppText>
            <View style={styles.dialogActions}>
              <SecondaryButton label={cancelLabel} onPress={onCancel} style={styles.flex} />
              <PrimaryButton label={confirmLabel} onPress={onConfirm} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </DirectionView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  dialog: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, gap: spacing.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  dialogActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
