import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar, SafetySheet } from '@/components/communication';
import { Button, Card, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  acceptConnectionRequest,
  formatCommunicationError,
  loadConnectionRequest,
  loadRelationshipStatus,
  updateConnectionRequest,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  ConnectionRequestRecord,
  RelationshipStatus,
} from '@/types/communication';

export default function ConnectRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const submitting = useRef(false);
  const [request, setRequest] = useState<ConnectionRequestRecord | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRequest(null);
    setRelationship(null);
    setSafetyOpen(false);
    setError(null);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    let active = true;
    loadConnectionRequest(id)
      .then(async (result) => {
        if (!active) return;
        setRequest(result);
        const otherId =
          result.requesterProfileId === user?.id
            ? result.recipientProfileId
            : result.requesterProfileId;
        setRelationship(await loadRelationshipStatus(otherId));
      })
      .catch((loadError) => {
        if (active) setError(formatCommunicationError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id]);

  async function accept() {
    if (!request || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await acceptConnectionRequest(request.id);
      showSuccess('Connection accepted.');
      if (result.conversationId) {
        router.replace(routes.conversation(result.conversationId));
      } else {
        router.replace(routes.connections);
      }
    } catch (acceptError) {
      setError(formatCommunicationError(acceptError));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmUpdate(action: 'withdraw' | 'decline') {
    Alert.alert(
      action === 'decline' ? 'Decline request?' : 'Withdraw request?',
      action === 'decline'
        ? 'The sender can submit another request after the server-enforced cooldown.'
        : 'This request will no longer be available to accept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'decline' ? 'Decline' : 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            if (submitting.current) return;
            submitting.current = true;
            setIsSubmitting(true);
            try {
              await updateConnectionRequest(id, action);
              showSuccess(
                action === 'decline' ? 'Request declined.' : 'Request withdrawn.',
              );
              router.back();
            } catch (updateError) {
              setError(formatCommunicationError(updateError));
            } finally {
              submitting.current = false;
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }

  if (isLoading) return <LoadingState message="Loading Connect request" />;
  if (!request || !user) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'This request is unavailable.'}</Text>
        <Button label="Go back" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  const received = request.recipientProfileId === user.id;
  const other = received ? request.requester : request.recipient;
  const isPending = request.status === 'pending';

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Connect request</Text>
        <Pressable
          accessibilityLabel="Request safety options"
          onPress={() => setSafetyOpen(true)}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push(routes.profile(other.id))}
        style={styles.person}>
        <ProfileAvatar profile={other} size={76} />
        <Text style={styles.name}>{other.displayName}</Text>
        <Text style={styles.meta}>
          {[other.primaryRole, other.city].filter(Boolean).join(' | ')}
        </Text>
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>
            {received ? 'Why they want to connect' : 'Your request'}
          </Text>
          <Chip accent={isPending} label={statusLabel(request.status)} />
        </View>
        <Text style={styles.reason}>{reasonLabel(request.reason)}</Text>
        {request.note ? <Text style={styles.body}>{request.note}</Text> : null}
        {request.portfolioTitle ? (
          <View style={styles.portfolio}>
            <Ionicons
              color={theme.colors.accentStrong}
              name="folder-open-outline"
              size={19}
            />
            <Text style={styles.portfolioText}>{request.portfolioTitle}</Text>
          </View>
        ) : null}
        <Text style={styles.date}>
          Sent {new Date(request.createdAt).toLocaleDateString()}
        </Text>
      </Card>

      {received && isPending ? (
        <View style={styles.actions}>
          <Button
            label="Accept and connect"
            loading={isSubmitting}
            onPress={() => void accept()}
          />
          <Button
            disabled={isSubmitting}
            label="Decline"
            onPress={() => confirmUpdate('decline')}
            variant="secondary"
          />
        </View>
      ) : null}
      {!received && isPending ? (
        <Button
          disabled={isSubmitting}
          label="Withdraw request"
          onPress={() => confirmUpdate('withdraw')}
          variant="danger"
        />
      ) : null}
      {relationship?.state === 'connected' && relationship.conversationId ? (
        <Button
          label="Open conversation"
          onPress={() =>
            router.push(routes.conversation(relationship.conversationId!))
          }
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SafetySheet
        blockedByMe={Boolean(relationship?.blockedByMe)}
        onClose={() => setSafetyOpen(false)}
        onStateChange={() => router.back()}
        profileId={other.id}
        targetId={request.id}
        targetKind="connection_request"
        visible={safetyOpen}
      />
    </Screen>
  );
}

function reasonLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function statusLabel(value: string) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  person: { alignItems: 'center', gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small, textAlign: 'center' },
  card: { gap: theme.spacing.md },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, flex: 1, fontSize: theme.typography.subheading, fontWeight: '900' },
  reason: { color: theme.colors.accentStrong, fontSize: theme.typography.small, fontWeight: '800' },
  body: { color: theme.colors.textSoft, fontSize: theme.typography.body, lineHeight: 24 },
  portfolio: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
  portfolioText: { color: theme.colors.accentStrong, flex: 1, fontSize: theme.typography.small, fontWeight: '700' },
  date: { color: theme.colors.mutedLight, fontSize: theme.typography.tiny },
  actions: { gap: theme.spacing.md },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20, textAlign: 'center' },
});
