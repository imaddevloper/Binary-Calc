import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/Text';
import { Card } from '../../components/Card';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { useI18n } from '../../hooks/useI18n';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, radius, TOUCH } from '../../theme/spacing';
import { loadOsiCompletedLayers, saveOsiCompletedLayers } from '../../storage/prefs';
import { OSI_LAYERS, OSI_PATHS, OSI_REFERENCES, OSI_ROADMAP, OSI_GLOSSARY } from './osiData';

export function OsiAcademy() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState(7);
  const [completed, setCompleted] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const selected = useMemo(() => OSI_LAYERS.find((layer) => layer.id === selectedId) ?? OSI_LAYERS[0], [selectedId]);

  useEffect(() => {
    let active = true;
    void loadOsiCompletedLayers().then((ids) => { if (active) setCompleted(ids); });
    return () => { active = false; };
  }, []);

  useEffect(() => { setAnswer(null); }, [selectedId]);

  const markComplete = () => {
    const next = completed.includes(selected.id) ? completed : [...completed, selected.id];
    setCompleted(next);
    void saveOsiCompletedLayers(next);
  };
  const openExternal = (url: string) => { void Linking.openURL(url).catch(() => {}); };
  const progress = Math.round((completed.length / OSI_LAYERS.length) * 100);

  return (
    <View style={styles.container}>
      <Card tone="accent">
        <AppText variant="label" color="accent">{ar ? 'أكاديمية الشبكات' : 'NETWORKING ACADEMY'}</AppText>
        <AppText variant="heading">{ar ? 'نموذج OSI ذي الطبقات السبع' : 'The OSI 7-layer model'}</AppText>
        <AppText color="secondary">{ar ? 'تعلّم كيف تنتقل البيانات من التطبيق إلى الإشارة المادية، مع أمثلة واختبارات.' : 'Learn how data travels from an application to physical signals, with examples and knowledge checks.'}</AppText>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
        <AppText variant="caption" color="secondary">{ar ? `${completed.length} من 7 طبقات مكتملة · ${progress}%` : `${completed.length} of 7 layers completed · ${progress}%`}</AppText>
      </Card>

      <View style={styles.sectionHeading}>
        <AppText variant="heading">{ar ? 'اختر طبقة للتعلّم' : 'Explore the layers'}</AppText>
        <AppText variant="caption" color="secondary">{ar ? 'من الطبقة 7 إلى الطبقة 1' : 'Layer 7 down to Layer 1'}</AppText>
      </View>
      <View style={styles.layerStack} accessibilityLabel={ar ? 'مخطط طبقات نموذج OSI' : 'OSI layer diagram'}>
        {OSI_LAYERS.map((layer) => {
          const active = selected.id === layer.id;
          const done = completed.includes(layer.id);
          return (
            <Pressable key={layer.id} accessibilityRole="button"
              accessibilityLabel={ar ? `الطبقة ${layer.id}: ${layer.ar}` : `Layer ${layer.id}: ${layer.name}`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedId(layer.id)}
              style={[styles.layerButton, { backgroundColor: active ? colors.accentSoft : colors.surface, borderColor: active ? colors.accent : colors.border }]}>
              <View style={[styles.layerNumber, { backgroundColor: active ? colors.primary : colors.elevated }]}>
                <AppText color={active ? 'onPrimary' : 'text'} variant="subheading">{layer.id}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="subheading">{ar ? layer.ar : layer.name}</AppText>
                <AppText variant="caption" color="secondary">{ar ? layer.summaryAr : layer.summary}</AppText>
              </View>
              {done ? <AppText color="success">✓</AppText> : null}
            </Pressable>
          );
        })}
      </View>

      <Card>
        <AppText variant="label" color="accent">{ar ? `الطبقة ${selected.id}` : `LAYER ${selected.id}`}</AppText>
        <AppText variant="title">{ar ? selected.ar : selected.name}</AppText>
        <AppText variant="subheading">{ar ? selected.summaryAr : selected.summary}</AppText>
        <AppText>{ar ? selected.purposeAr : selected.purpose}</AppText>
        <AppText variant="subheading">{ar ? 'المسؤوليات الرئيسية' : 'Key responsibilities'}</AppText>
        {(ar ? selected.dutiesAr : selected.duties).map((item) => <AppText key={item} color="secondary">• {item}</AppText>)}
        <View style={[styles.infoPanel, { backgroundColor: colors.elevated }]}>
          <AppText variant="caption" color="accent">{ar ? 'تشبيه من الواقع' : 'REAL-WORLD ANALOGY'}</AppText>
          <AppText>{ar ? selected.analogyAr : selected.analogy}</AppText>
        </View>
        <AppText variant="subheading">{ar ? 'تقنيات وأمثلة' : 'Technologies and examples'}</AppText>
        <View style={styles.chips}>
          {selected.technologies.map((item) => <View key={item} style={[styles.chip, { backgroundColor: colors.accentSoft }]}><AppText variant="caption" color="accent">{item}</AppText></View>)}
        </View>
        <AppText>{ar ? selected.exampleAr : selected.example}</AppText>
        <View style={[styles.infoPanel, { backgroundColor: colors.elevated }]}>
          <AppText variant="caption" color="warning">{ar ? 'معلومة يجب الانتباه لها' : 'COMMON MISUNDERSTANDING'}</AppText>
          <AppText>{ar ? selected.misconceptionAr : selected.misconception}</AppText>
        </View>
        <View style={styles.quiz}>
          <AppText variant="subheading">{ar ? 'اختبر فهمك' : 'Quick knowledge check'}</AppText>
          <AppText>{ar ? selected.questionAr : selected.question}</AppText>
          {(ar ? selected.optionsAr : selected.options).map((option, index) => {
            const chosen = answer === index;
            const correct = answer !== null && index === selected.answer;
            return <Pressable key={`${selected.id}-${index}`} accessibilityRole="radio"
              accessibilityState={{ checked: chosen }} onPress={() => setAnswer(index)}
              style={[styles.option, { borderColor: correct ? colors.success : chosen ? colors.accent : colors.border, backgroundColor: correct ? colors.accentSoft : chosen ? colors.elevated : colors.surface }]}>
              <AppText>{option}</AppText>{correct ? <AppText color="success">✓</AppText> : null}
            </Pressable>;
          })}
          {answer !== null ? <AppText color={answer === selected.answer ? 'success' : 'error'}>
            {answer === selected.answer ? (ar ? 'إجابة صحيحة! ' : 'Correct! ') : (ar ? 'ليست الإجابة الصحيحة. ' : 'Not quite. ')}
            {ar ? selected.explanationAr : selected.explanation}
          </AppText> : null}
        </View>
        <PrimaryButton label={completed.includes(selected.id) ? (ar ? 'تم إكمال هذه الطبقة' : 'Layer completed') : (ar ? 'تحديد الطبقة كمكتملة' : 'Mark layer as complete')}
          onPress={markComplete} disabled={completed.includes(selected.id)} />
        <View style={styles.navigation}>
          <SecondaryButton label={ar ? 'الطبقة السابقة' : 'Previous layer'} disabled={selected.id === 1}
            onPress={() => setSelectedId(Math.max(1, selected.id - 1))} style={styles.navButton} />
          <SecondaryButton label={ar ? 'الطبقة التالية' : 'Next layer'} disabled={selected.id === 7}
            onPress={() => setSelectedId(Math.min(7, selected.id + 1))} style={styles.navButton} />
        </View>
      </Card>

      <Card>
        <AppText variant="heading">{ar ? 'مسار التعلّم المقترح' : 'Learning roadmap'}</AppText>
        {OSI_ROADMAP.map((stage, index) => <View key={stage.en} style={styles.roadmapRow}>
          <View style={[styles.stageNumber, { backgroundColor: colors.accentSoft }]}><AppText color="accent" variant="subheading">{index + 1}</AppText></View>
          <View style={styles.flex}>
            <AppText variant="subheading">{ar ? stage.ar : stage.en}</AppText>
            <AppText variant="caption" color="secondary">{ar ? stage.detailAr : stage.detail}</AppText>
          </View>
          <AppText variant="caption" color="secondary">{stage.time}</AppText>
        </View>)}
      </Card>

      <Card>
        <AppText variant="heading">{ar ? 'كيف تُغلّف البيانات؟' : 'How encapsulation works'}</AppText>
        <AppText color="secondary">{ar ? 'أثناء الإرسال، تضيف الطبقات معلومات تحكم حول بيانات الطبقات الأعلى. هذا رسم تعليمي مبسط.' : 'As data is sent, layers add control information around data from higher layers. This is a simplified teaching view.'}</AppText>
        {[
          ['L7–L5', ar ? 'بيانات التطبيق' : 'Application data'],
          ['L4', ar ? 'مقطع TCP أو مخطط UDP' : 'TCP segment or UDP datagram'],
          ['L3', ar ? 'حزمة IP' : 'IP packet'],
          ['L2', ar ? 'إطار Ethernet أو Wi-Fi' : 'Ethernet or Wi-Fi frame'],
          ['L1', ar ? 'بتات وإشارات' : 'Bits and signals'],
        ].map(([layer, label]) => <View key={layer} style={styles.encapRow}>
          <AppText variant="label" color="accent">{layer}</AppText>
          <View style={styles.encapBar}><AppText>{label}</AppText></View>
        </View>)}
        <AppText variant="caption" color="secondary">{ar ? 'عند الاستقبال، تُزال معلومات التغليف تدريجياً (Decapsulation).' : 'At the receiver, encapsulation information is removed layer by layer (decapsulation).'}</AppText>
      </Card>

      <Card>
        <AppText variant="heading">{ar ? 'قاموس مصطلحات الشبكات' : 'Networking glossary'}</AppText>
        {OSI_GLOSSARY.map(([term, definition, definitionAr]) => <View key={term} style={styles.glossaryRow}>
          <AppText variant="subheading">{term}</AppText>
          <AppText color="secondary">{ar ? definitionAr : definition}</AppText>
        </View>)}
      </Card>

      <Card>
        <AppText variant="heading">{ar ? 'مسارات ومراجع موثوقة' : 'Learning paths and references'}</AppText>
        {[...OSI_PATHS.map((item) => ({ title: item.name, url: item.url })), ...OSI_REFERENCES].map((item) => <Pressable key={item.title}
          accessibilityRole="link" onPress={() => openExternal(item.url)} style={styles.resourceRow}>
          <AppText color="accent">{item.title}</AppText>
          <AppText color="secondary" variant="caption">{item.url}</AppText>
        </Pressable>)}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xl },
  sectionHeading: { gap: spacing.xs },
  layerStack: { gap: spacing.xs },
  layerButton: { minHeight: TOUCH, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  layerNumber: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: spacing.xs },
  infoPanel: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  quiz: { gap: spacing.sm },
  option: { minHeight: TOUCH, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navigation: { flexDirection: 'row', gap: spacing.sm },
  navButton: { flex: 1 },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(127,127,127,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  roadmapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  stageNumber: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  encapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  encapBar: { flex: 1, borderWidth: 1, borderColor: 'rgba(127,127,127,0.25)', borderRadius: radius.sm, padding: spacing.sm },
  glossaryRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  resourceRow: { minHeight: TOUCH, justifyContent: 'center', gap: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127,127,127,0.25)' },
});
