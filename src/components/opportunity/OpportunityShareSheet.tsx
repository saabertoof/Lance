import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import { getOpportunityShareCopy } from '@/lib/opportunity';
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
  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';

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
            <Text style={styles.title}>Post it anywhere.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close share panel"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}>
            <Ionicons color={theme.colors.text} name="close" size={22} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.posterImage}>
            {opportunity.poster.imageUrl ? (
              <Image
                contentFit="cover"
                source={opportunity.poster.imageUrl}
                style={styles.image}
              />
            ) : (
              <Text style={styles.mark}>{mark}</Text>
            )}
          </View>
          <View style={styles.cardCopy}>
            <Text numberOfLines={1} style={styles.posterName}>
              {opportunity.poster.name}
            </Text>
            <Text numberOfLines={2} style={styles.opportunityTitle}>
              {opportunity.title}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Copy public opportunity link"
          accessibilityRole="button"
          onPress={() => void copy('Link', share.url)}
          style={({ pressed }) => [styles.linkBox, pressed && styles.pressed]}>
          <View style={styles.linkIcon}>
            <Ionicons color={theme.colors.accentStrong} name="link-outline" size={20} />
          </View>
          <Text numberOfLines={1} style={styles.linkText}>
            {share.url}
          </Text>
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
            label="Linktree button"
            onCopy={() => void copy('Linktree text', share.linktreeText)}
            value={share.linktreeText}
          />
          <ShareCopyRow
            icon="camera-outline"
            label="Story text"
            onCopy={() => void copy('Story text', share.storyText)}
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
    gap: theme.spacing.lg,
    padding: theme.layout.screenPadding,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
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
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  posterImage: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  cardCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  posterName: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  opportunityTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
    lineHeight: 22,
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
  linkText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '800',
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
    fontWeight: '900',
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
