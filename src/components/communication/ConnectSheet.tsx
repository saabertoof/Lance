import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SingleSelectChips } from '@/components/profile';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCommunicationError,
  sendConnectionRequest,
} from '@/lib/communication';
import { loadProfilePolish } from '@/lib/profilePolish';
import {
  connectReasonOptions,
  type ConnectReason,
  type ConnectResult,
} from '@/types/communication';
import type { PublicProfile } from '@/types/profile';
import type { PortfolioItem } from '@/types/profilePolish';

export function ConnectSheet({
  onClose,
  onSuccess,
  profile,
  visible,
}: {
  onClose: () => void;
  onSuccess: (result: ConnectResult) => void;
  profile: PublicProfile | null;
  visible: boolean;
}) {
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const submitting = useRef(false);
  const [reason, setReason] = useState<ConnectReason | null>(null);
  const [note, setNote] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioItemId, setPortfolioItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !user) return;
    loadProfilePolish(user.id)
      .then((polish) => setPortfolio(polish.portfolio))
      .catch(() => setPortfolio([]));
  }, [user, visible]);

  async function submit() {
    if (!profile || !reason || submitting.current) {
      if (!reason) setError('Choose a reason for connecting.');
      return;
    }
    if (reason === 'other' && !note.trim()) {
      setError('Add a short explanation for Other.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await sendConnectionRequest({
        profileId: profile.id,
        reason,
        note,
        portfolioItemId,
      });
      showSuccess(
        result.state === 'connected'
          ? "You're connected."
          : 'Connection request sent.',
      );
      onSuccess(result);
      setReason(null);
      setNote('');
      setPortfolioItemId(null);
      onClose();
    } catch (submitError) {
      setError(formatCommunicationError(submitError));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
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
            <Text style={styles.title}>Connect</Text>
            <Text style={styles.subtitle}>Tell them why you want to connect.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {profile ? (
            <View style={styles.identity}>
              <Avatar name={profile.displayName} url={profile.avatarUrl} />
              <View style={styles.identityCopy}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Text style={styles.meta}>{profile.primaryRole}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.label}>Reason</Text>
            <SingleSelectChips
              onChange={(value) => setReason(value || null)}
              options={connectReasonOptions}
              selected={reason ?? ''}
            />
          </View>
          <TextField
            label={reason === 'other' ? 'Explanation' : 'Optional note'}
            maxLength={300}
            multiline
            onChangeText={setNote}
            placeholder="A short, specific message"
            style={styles.note}
            value={note}
          />
          {portfolio.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>Optional portfolio item</Text>
              <View style={styles.portfolio}>
                {portfolio.map((item) => {
                  const selected = item.id === portfolioItemId;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={item.id}
                      onPress={() =>
                        setPortfolioItemId(selected ? null : item.id)
                      }
                      style={[
                        styles.portfolioItem,
                        selected && styles.portfolioSelected,
                      ]}>
                      {item.mediaUrl || item.thumbnailUrl ? (
                        <Image
                          contentFit="cover"
                          source={item.thumbnailUrl ?? item.mediaUrl}
                          style={styles.portfolioImage}
                        />
                      ) : null}
                      <Text numberOfLines={2} style={styles.portfolioTitle}>
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Text style={styles.review}>
            Review your reason before sending. Nothing is submitted by the swipe itself.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onClose} variant="ghost" />
          <Button
            label="Send request"
            loading={isSubmitting}
            onPress={() => void submit()}
            style={styles.primary}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <View style={styles.avatar}>
      {url ? (
        <Image contentFit="cover" source={url} style={styles.fill} />
      ) : (
        <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.layout.screenPadding,
  },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: theme.typography.small, marginTop: 3 },
  close: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
  content: { gap: theme.spacing.xl, padding: theme.layout.screenPadding, paddingBottom: 120 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md },
  identityCopy: { flex: 1 },
  avatar: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: 30, height: 60, justifyContent: 'center', overflow: 'hidden', width: 60 },
  fill: { height: '100%', width: '100%' },
  initial: { color: theme.colors.accentStrong, fontSize: theme.typography.heading, fontWeight: '900' },
  name: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small, marginTop: 3 },
  section: { gap: theme.spacing.md },
  label: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  note: { minHeight: 110, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  portfolio: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolioItem: { borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, gap: theme.spacing.sm, overflow: 'hidden', paddingBottom: theme.spacing.sm, width: '47%' },
  portfolioSelected: { borderColor: theme.colors.accent, borderWidth: 2 },
  portfolioImage: { aspectRatio: 16 / 9, width: '100%' },
  portfolioTitle: { color: theme.colors.text, fontSize: theme.typography.tiny, fontWeight: '700', paddingHorizontal: theme.spacing.sm },
  review: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18 },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
  actions: { alignItems: 'center', borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
  primary: { flex: 1 },
});
