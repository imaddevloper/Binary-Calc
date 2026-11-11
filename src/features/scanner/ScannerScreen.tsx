import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppHeader } from '../../components/AppHeader';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { AppText } from '../../components/Text';
import { PrimaryButton, SecondaryButton, IconButton } from '../../components/Buttons';
import { ErrorMessage, InfoMessage, LoadingIndicator } from '../../components/Feedback';
import { InputField } from '../../components/InputField';
import { ScannerFrame } from './ScannerFrame';
import { OcrCandidateCard } from './OcrCandidateCard';
import { useI18n } from '../../hooks/useI18n';
import { radius, spacing } from '../../theme/spacing';
import { isOnlineOcrConfigured, scanImageForIPv4 } from '../../services/ocr';
import type { ScanOutcome } from '../../services/ocr';
import { parseIPv4 } from '../../core/ipv4/index.ts';
import type { OcrCandidate } from '../../core/ocr/candidates.ts';
import { setPendingIp } from '../ipv4/pendingIp';
import { ipv4Error } from '../messages';

const MAX_MB = 15;
const OK_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type Stage = 'camera' | 'processing' | 'review';

export function ScannerScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [stage, setStage] = useState<Stage>(source === 'gallery' ? 'review' : 'camera');
  const [fromGallery, setFromGallery] = useState(source === 'gallery');
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [candidates, setCandidates] = useState<OcrCandidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true);
  const pickedOnce = useRef(false);

  useEffect(() => {
    // React Strict Mode may run setup/cleanup twice in development; restore the flag on setup.
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const runOcr = useCallback(async (imageUri: string) => {
    setStage('processing');
    setMessage(null);
    let remoteImage: { base64: string; mimeType: 'image/jpeg' } | undefined;
    const allowOnline = isOnlineOcrConfigured()
      ? await new Promise<boolean>((resolve) => {
          let settled = false;
          const finish = (value: boolean) => {
            if (settled) return;
            settled = true;
            resolve(value);
          };
          Alert.alert(
            t('scan.onlineTitle'),
            t('scan.onlineBody'),
            [
              { text: t('scan.localOption'), style: 'cancel', onPress: () => finish(false) },
              { text: t('scan.onlineOption'), onPress: () => finish(true) },
            ],
            { cancelable: true, onDismiss: () => finish(false) },
          );
        })
      : false;
    if (allowOnline) {
      try {
        const optimized = await ImageManipulator.manipulate(imageUri)
          .resize({ width: 1600 })
          .renderAsync();
        const encoded = await optimized.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.78,
          base64: true,
        });
        if (encoded.base64) remoteImage = { base64: encoded.base64, mimeType: 'image/jpeg' };
      } catch {
        // Continue with the on-device OCR engine if image preparation fails.
      }
    }
    const res = await scanImageForIPv4(imageUri, undefined, remoteImage);
    if (!alive.current) return;
    setOutcome(res);
    if (res.status === 'ok') {
      // Auto-open a single exact, validated IPv4 result. Corrected OCR text and
      // ambiguous/multiple results stay in review so a recognition guess is never trusted.
      if (
        res.candidates.length === 1 &&
        res.candidates[0].valid &&
        !res.candidates[0].needsConfirmation
      ) {
        setPendingIp(res.candidates[0].suggested);
        router.replace('/ipv4');
        return;
      }
      setCandidates(res.candidates);
      setSelected(res.candidates.length === 1 ? 0 : null);
      setText(res.candidates.length === 1 ? res.candidates[0].suggested : '');
    } else {
      setCandidates([]);
      setSelected(null);
      setText('');
    }
    setStage('review');
  }, [router, t]);

  const pickFromGallery = async () => {
    setFromGallery(true);
    try {
      // The system photo picker needs no storage permission.
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (res.canceled || res.assets.length === 0) {
        if (!uri) setStage(permission?.granted && source !== 'gallery' ? 'camera' : 'review');
        return;
      }
      const a = res.assets[0];
      const mime = (a.mimeType ?? '').toLowerCase();
      const looksOk = mime ? OK_TYPES.includes(mime) : /\.(jpe?g|png|webp)$/i.test(a.uri);
      if (!looksOk) { setMessage(t('scan.unsupported')); setStage('review'); return; }
      if (a.fileSize && a.fileSize > MAX_MB * 1024 * 1024) { setMessage(t('scan.tooBig', { mb: MAX_MB })); setStage('review'); return; }
      setUri(a.uri);
      await runOcr(a.uri);
    } catch {
      setMessage(t('scan.pickFailed'));
      setStage('review');
    }
  };

  // Opened via "Import image": go straight to the picker once.
  // pickFromGallery is intentionally invoked once per route entry; pickedOnce prevents duplicate launches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (source === 'gallery' && !pickedOnce.current) {
      pickedOnce.current = true;
      void pickFromGallery();
    }
  }, [source]);

  const capture = async () => {
    if (!cameraRef.current || !cameraReady) { setMessage(t('scan.cameraNotReady')); return; }
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!pic?.uri) throw new Error('no picture');
      setFromGallery(false);
      setUri(pic.uri);
      await runOcr(pic.uri);
    } catch {
      setMessage(t('scan.cameraFailed'));
    }
  };

  const rotate = async () => {
    if (!uri) return;
    try {
      const ctx = ImageManipulator.manipulate(uri);
      ctx.rotate(90);
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      setUri(saved.uri);
      await runOcr(saved.uri);
    } catch {
      setMessage(t('scan.ocrFailed'));
    }
  };

  const retake = () => {
    setUri(null); setOutcome(null); setCandidates([]); setSelected(null); setText(''); setMessage(null);
    if (fromGallery || !permission?.granted) void pickFromGallery();
    else setStage('camera');
  };

  const parsed = text.trim() === '' ? null : parseIPv4(text);
  const validNow = !!parsed && parsed.ok;
  const analyze = () => {
    // Same strict validator as manual entry; nothing is analyzed unless it passes.
    const p = parseIPv4(text);
    if (!p.ok) return;
    setPendingIp(p.normalized);
    router.replace('/ipv4');
  };

  const header = <AppHeader back title={t('scan.title')} />;

  // ---- camera stage
  if (stage === 'camera') {
    if (!permission) return <Screen header={header}><LoadingIndicator /></Screen>;

    if (!permission.granted) {
      const blocked = !permission.canAskAgain;
      return (
        <Screen header={header}>
          <Card>
            <AppText variant="heading">{blocked ? t('scan.deniedTitle') : t('scan.permTitle')}</AppText>
            <AppText variant="body" color="secondary">{blocked ? t('scan.deniedBody') : t('scan.permBody')}</AppText>
            {blocked ? (
              <PrimaryButton icon="settings" label={t('common.openSettings')} onPress={() => void Linking.openSettings()} />
            ) : (
              <PrimaryButton icon="camera" label={t('scan.grant')} onPress={() => void requestPermission()} />
            )}
            <SecondaryButton icon="image" label={t('scan.gallery')} onPress={() => void pickFromGallery()} />
            <SecondaryButton icon="create" label={t('scan.manual')} onPress={() => router.replace('/ipv4')} />
            <InfoMessage message={t('scan.localOnly')} />
          </Card>
        </Screen>
      );
    }

    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        <CameraView ref={cameraRef} style={styles.fill} facing="back" enableTorch={torch} onCameraReady={() => setCameraReady(true)} />
        <ScannerFrame />
        <View style={styles.top}>{header}</View>
        <View style={styles.bottom}>
          <View style={styles.hintPill}>
            <AppText variant="label" style={{ color: '#fff' }} align="center">{t('scan.instruction')}</AppText>
          </View>
          <ErrorMessage message={message} />
          <View style={styles.controls}>
            <IconButton icon="image" color="#fff" label={t('scan.gallery')} onPress={() => void pickFromGallery()} style={styles.round} />
            <IconButton icon="camera" color="#fff" size={34} label={t('scan.capture')} onPress={() => void capture()} style={[styles.round, styles.shutter]} />
            <IconButton
              icon={torch ? 'flash' : 'flash-off'}
              color="#fff"
              label={torch ? t('scan.torchOff') : t('scan.torchOn')}
              onPress={() => setTorch((v) => !v)}
              style={styles.round}
            />
          </View>
        </View>
      </View>
    );
  }

  // ---- processing
  if (stage === 'processing') {
    return (
      <Screen header={header}>
        {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="contain" accessibilityLabel={t('scan.preview')} /> : null}
        <LoadingIndicator label={t('scan.processing')} />
        <SecondaryButton label={t('scan.cancel')} onPress={() => router.back()} />
      </Screen>
    );
  }

  // ---- review
  const statusMsg =
    outcome?.status === 'unavailable' ? t('scan.ocrUnavailable')
    : outcome?.status === 'failed' ? t('scan.ocrFailed')
    : outcome?.status === 'no_text' ? t('scan.noText')
    : outcome?.status === 'no_address' ? t('scan.noAddress')
    : null;

  return (
    <Screen header={header}>
      {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="contain" accessibilityLabel={t('scan.preview')} /> : null}
      <ErrorMessage message={message ?? statusMsg} />

      {candidates.length > 0 ? (
        <Card>
          <AppText variant="heading">{t('scan.candidates')}</AppText>
          <InfoMessage message={candidates.length > 1 ? t('scan.found') : t('scan.foundOne')} />
          <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
            {candidates.map((c, i) => (
              <OcrCandidateCard
                key={`${c.raw}-${i}`}
                candidate={c}
                selected={selected === i}
                onSelect={() => { setSelected(i); setText(c.suggested); }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{t('scan.edit')}</AppText>
        <InputField
          label={t('ipv4.input')}
          value={text}
          onChangeText={(v) => { setText(v); }}
          placeholder={t('ipv4.placeholder')}
          keyboardType="numbers-and-punctuation"
          error={parsed && !parsed.ok ? ipv4Error(parsed.error, parsed.octetIndex, t) : null}
        />
        {validNow ? <InfoMessage tone="success" message={t('scan.validOk')} /> : null}
        <PrimaryButton label={t('scan.analyze')} onPress={analyze} disabled={!validNow} />
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <SecondaryButton icon="camera" label={t('scan.retake')} onPress={retake} style={styles.flexBtn} />
        <SecondaryButton icon="refresh" label={t('scan.rotate')} onPress={() => void rotate()} disabled={!uri} style={styles.flexBtn} />
        <SecondaryButton icon="image" label={t('scan.chooseAnother')} onPress={() => void pickFromGallery()} style={styles.flexBtn} />
      </View>
      <InfoMessage message={t('scan.localOnly')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl, gap: spacing.md, backgroundColor: 'rgba(0,0,0,0.45)' },
  hintPill: { alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.5)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', direction: 'ltr' },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#D91E2B' },
  preview: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: '#000' },
  flexBtn: { flexGrow: 1, flexBasis: 140 },
});
