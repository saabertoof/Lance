import { useRef, useState } from 'react';
import {
  Alert,
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
import { useFeedback } from '@/context/FeedbackContext';
import {
  blockProfile,
  formatCommunicationError,
  submitReport,
  unblockProfile,
} from '@/lib/communication';
import {
  reportReasonOptions,
  type ReportReason,
  type ReportTargetKind,
} from '@/types/communication';

export function SafetySheet({
  blockedByMe,
  onClose,
  onStateChange,
  profileId,
  targetId,
  targetKind,
  visible,
}: {
  blockedByMe: boolean;
  onClose: () => void;
  onStateChange: () => void;
  profileId: string;
  targetId: string;
  targetKind: ReportTargetKind;
  visible: boolean;
}) {
  const submitting = useRef(false);
  const { showSuccess } = useFeedback();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function report() {
    if (!reason || submitting.current) {
      if (!reason) setError('Choose a report reason.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitReport({ kind: targetKind, targetId, reason, details });
      showSuccess('Report submitted privately.');
      setReason(null);
      setDetails('');
      onClose();
    } catch (reportError) {
      setError(formatCommunicationError(reportError));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmBlock() {
    Alert.alert(
      blockedByMe ? 'Unblock this person?' : 'Block this person?',
      blockedByMe
        ? 'You may be able to contact each other again.'
        : "They won't be notified. You will no longer be able to contact each other on Lance.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blockedByMe ? 'Unblock' : 'Block',
          style: blockedByMe ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (blockedByMe) await unblockProfile(profileId);
              else await blockProfile(profileId);
              showSuccess(blockedByMe ? 'Profile unblocked.' : 'Profile blocked.');
              onStateChange();
              onClose();
            } catch (blockError) {
              setError(formatCommunicationError(blockError));
            }
          },
        },
      ],
    );
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Safety</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.privacy}>
            Reports are private. The reported user will not be told who submitted the report.
          </Text>
          <View style={styles.section}>
            <Text style={styles.label}>Report reason</Text>
            <SingleSelectChips
              onChange={(value) => setReason(value || null)}
              options={reportReasonOptions}
              selected={reason ?? ''}
            />
          </View>
          <TextField
            label="Optional details"
            maxLength={1000}
            multiline
            onChangeText={setDetails}
            placeholder="Share only the context needed to review this report"
            style={styles.details}
            value={details}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Submit report"
            loading={isSubmitting}
            onPress={() => void report()}
          />
          <View style={styles.divider} />
          <Button
            label={blockedByMe ? 'Unblock profile' : 'Block profile'}
            onPress={confirmBlock}
            variant={blockedByMe ? 'secondary' : 'danger'}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: theme.layout.screenPadding },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  close: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
  content: { gap: theme.spacing.xl, padding: theme.layout.screenPadding },
  privacy: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, color: theme.colors.muted, fontSize: theme.typography.small, lineHeight: 21, padding: theme.spacing.md },
  section: { gap: theme.spacing.md },
  label: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  details: { minHeight: 120, paddingTop: theme.spacing.md, textAlignVertical: 'top' },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20 },
  divider: { backgroundColor: theme.colors.border, height: 1 },
});
