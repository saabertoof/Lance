import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar, SafetySheet } from '@/components/communication';
import { Button, Card, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import {
  formatCommunicationError,
  loadOpportunityResponse,
  loadRelationshipStatus,
  startOpportunityConversation,
  updateOpportunityResponse,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  OpportunityResponseRecord,
  RelationshipStatus,
} from '@/types/communication';

export default function OpportunityResponseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const submitting = useRef(false);
  const [response, setResponse] = useState<OpportunityResponseRecord | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadOpportunityResponse(id)
      .then(async (result) => {
        if (!active) return;
        setResponse(result);
        const otherId =
          result.ownerProfileId === user?.id
            ? result.responderProfileId
            : result.ownerProfileId;
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

  async function startDiscussion() {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const conversationId = await startOpportunityConversation(id);
      showSuccess('Discussion started.');
      router.replace(routes.conversation(conversationId));
    } catch (startError) {
      setError(formatCommunicationError(startError));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function confirmUpdate(action: 'withdraw' | 'decline' | 'close') {
    const labels = {
      withdraw: 'Withdraw response',
      decline: 'Decline response',
      close: 'Close discussion',
    };
    Alert.alert(`${labels[action]}?`, 'This status change is recorded for both people.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: labels[action],
        style: 'destructive',
        onPress: async () => {
          if (submitting.current) return;
          submitting.current = true;
          setIsSubmitting(true);
          try {
            await updateOpportunityResponse(id, action);
            showSuccess(`${labels[action]} complete.`);
            router.back();
          } catch (updateError) {
            setError(formatCommunicationError(updateError));
          } finally {
            submitting.current = false;
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }

  if (isLoading) return <LoadingState message="Loading opportunity response" />;
  if (!response || !user) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'This response is unavailable.'}</Text>
      </Screen>
    );
  }

  const ownerView = response.ownerProfileId === user.id;
  const otherProfileId = ownerView
    ? response.responderProfileId
    : response.ownerProfileId;

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Opportunity response</Text>
        <Pressable
          accessibilityLabel="Response safety options"
          onPress={() => setSafetyOpen(true)}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push(routes.profile(response.responder.id))}
        style={styles.person}>
        <ProfileAvatar profile={response.responder} size={76} />
        <Text style={styles.name}>{response.responder.displayName}</Text>
        <Text style={styles.meta}>
          {[response.responder.primaryRole, response.responder.city]
            .filter(Boolean)
            .join(' | ')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push(routes.opportunity(response.opportunityId))}
        style={styles.opportunity}>
        <View style={styles.opportunityCopy}>
          <Text style={styles.opportunityLabel}>Opportunity</Text>
          <Text style={styles.opportunityTitle}>{response.opportunityTitle}</Text>
          <Text style={styles.poster}>{response.posterName}</Text>
        </View>
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>
            {ownerView ? 'Their response' : 'Your response'}
          </Text>
          <Chip
            accent={response.status === 'submitted'}
            label={statusLabel(response.status)}
          />
        </View>
        {response.note ? <Text style={styles.body}>{response.note}</Text> : null}
        {response.selectedSkills.length > 0 ? (
          <View style={styles.skills}>
            {response.selectedSkills.map((skill) => (
              <Chip key={skill.id} label={skill.name} />
            ))}
          </View>
        ) : null}
        {response.portfolioTitle ? (
          <View style={styles.portfolio}>
            {response.portfolioMediaUrl ? (
              <Image source={response.portfolioMediaUrl} style={styles.portfolioImage} />
            ) : (
              <Ionicons
                color={theme.colors.accentStrong}
                name="folder-open-outline"
                size={22}
              />
            )}
            <View style={styles.portfolioCopy}>
              <Text style={styles.portfolioLabel}>Shared portfolio item</Text>
              <Text style={styles.portfolioTitle}>{response.portfolioTitle}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.date}>
          Sent {new Date(response.createdAt).toLocaleDateString()}
        </Text>
      </Card>

      {ownerView && response.status === 'submitted' ? (
        <View style={styles.actions}>
          <Button
            label="Start discussion"
            loading={isSubmitting}
            onPress={() => void startDiscussion()}
          />
          <Button
            disabled={isSubmitting}
            label="Decline response"
            onPress={() => confirmUpdate('decline')}
            variant="secondary"
          />
        </View>
      ) : null}
      {!ownerView && response.status === 'submitted' ? (
        <Button
          disabled={isSubmitting}
          label="Withdraw response"
          onPress={() => confirmUpdate('withdraw')}
          variant="danger"
        />
      ) : null}
      {response.status === 'in_discussion' && response.conversationId ? (
        <View style={styles.actions}>
          <Button
            label="Open conversation"
            onPress={() =>
              router.push(routes.conversation(response.conversationId!))
            }
          />
          {ownerView ? (
            <Button
              label="Close discussion"
              onPress={() => confirmUpdate('close')}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SafetySheet
        blockedByMe={Boolean(relationship?.blockedByMe)}
        onClose={() => setSafetyOpen(false)}
        onStateChange={() => router.back()}
        profileId={otherProfileId}
        targetId={response.id}
        targetKind="opportunity_response"
        visible={safetyOpen}
      />
    </Screen>
  );
}

function statusLabel(value: string) {
  if (value === 'in_discussion') return 'In discussion';
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  title: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  person: { alignItems: 'center', gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '900' },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small, textAlign: 'center' },
  opportunity: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  opportunityCopy: { flex: 1, gap: 2 },
  opportunityLabel: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '800', textTransform: 'uppercase' },
  opportunityTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  poster: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  card: { gap: theme.spacing.md },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, flex: 1, fontSize: theme.typography.subheading, fontWeight: '900' },
  body: { color: theme.colors.textSoft, fontSize: theme.typography.body, lineHeight: 24 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  portfolio: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  portfolioImage: { borderRadius: theme.radii.sm, height: 48, width: 48 },
  portfolioCopy: { flex: 1, gap: 2 },
  portfolioLabel: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  portfolioTitle: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  date: { color: theme.colors.mutedLight, fontSize: theme.typography.tiny },
  actions: { gap: theme.spacing.md },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20, textAlign: 'center' },
});
