import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpportunityLinkPreviewCard } from '@/components/create';
import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCompensation,
  formatOpportunityLocation,
  getOpportunityShareCopy,
} from '@/lib/opportunity';
import type { OpportunityRecord } from '@/types/opportunity';

export function OpportunityShareSheet({
  onClose,
  opportunity,
  visible,
}: {
  onClose: () => void;
  opportunity: OpportunityRecord;
  visible: boolean;
}) {
  const { showSuccess } = useFeedback();
  const share = getOpportunityShareCopy(opportunity);

  async function copy(label: string, value: string) {
    await Clipboard.setStringAsync(value);
    showSuccess(`${label} copied.`);
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Share opportunity</Text>
            <Text style={styles.title}>Your link is ready.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close share panel"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}>
            <Ionicons color={theme.colors.text} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <OpportunityLinkPreviewCard
            compensationLabel={formatCompensation(opportunity)}
            locationLabel={formatOpportunityLocation(opportunity)}
            posterImageUrl={opportunity.poster.imageUrl}
            posterLabel={opportunity.poster.name}
            skills={opportunity.skills}
            summary={opportunity.shortSummary}
            title={opportunity.title}
            urlLabel={share.url}
          />

          <Pressable
            accessibilityLabel="Copy public opportunity link"
            accessibilityRole="button"
            onPress={() => void copy('Link', share.url)}
            style={({ pressed }) => [styles.linkBox, pressed && styles.pressed]}>
            <View style={styles.linkIcon}>
              <Ionicons color={theme.colors.accentStrong} name="link-outline" size={20} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkLabel}>Public Lance link</Text>
              <Text numberOfLines={1} style={styles.linkText}>
                {share.url}
              </Text>
            </View>
            <Ionicons color={theme.colors.muted} name="copy-outline" size={19} />
          </Pressable>

          <View style={styles.actions}>
            <Button
              label="Copy link"
              onPress={() => void copy('Link', share.url)}
              style={styles.actionButton}
              variant="secondary"
            />
            <Button
              label="Share"
              onPress={() => void Share.share({ message: share.nativeMessage })}
              style={styles.actionButton}
            />
          </View>

          <View style={styles.suggestions}>
            <ShareCopyRow
              icon="leaf-outline"
              label="Linktree title"
              onCopy={() => void copy('Linktree title', share.linktreeText)}
              value={share.linktreeText}
            />
            <ShareCopyRow
              icon="camera-outline"
              label="Bio or story line"
              onCopy={() => void copy('Bio line', share.storyText)}
              value={share.storyText}
            />
            <ShareCopyRow
              icon="chatbubble-ellipses-outline"
              label="Discord / X caption"
              onCopy={() => void copy('Caption', share.socialCaption)}
              value={share.socialCaption}
            />
          </View>

          <Text style={styles.note}>
            Applicants can read the page first, then apply with a reusable Lance profile.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ShareCopyRow({
  icon,
  label,
  onCopy,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Copy ${label}`}
      accessibilityRole="button"
      onPress={onCopy}
      style={({ pressed }) => [styles.copyRow, pressed && styles.pressed]}>
      <View style={styles.copyIcon}>
        <Ionicons color={theme.colors.text} name={icon} size={19} />
      </View>
      <View style={styles.copyText}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.copyValue}>
          {value}
        </Text>
      </View>
      <Ionicons color={theme.colors.muted} name="copy-outline" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.layout.screenPadding,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  linkBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 58,
    paddingHorizontal: theme.spacing.md,
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  linkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  linkLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  linkText: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  suggestions: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  copyRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 74,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  copyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copyText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  copyLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  copyValue: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  note: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
