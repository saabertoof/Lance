import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityInterestAction } from '@/components/communication';
import {
  CompensationBadge,
  OpportunityShareSheet,
  WorkArrangementBadge,
} from '@/components/opportunity';
import { Button, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatDateLabel } from '@/lib/date';
import {
  formatCompensation,
  formatOpportunityError,
  getOpportunityPublicUrl,
  loadPublicOpportunityBySlug,
  needsCompensationWarning,
} from '@/lib/opportunity';
import {
  opportunityExperienceOptions,
  type OpportunityRecord,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
} from '@/types/opportunity';
import { getOptionLabel } from '@/types/profile';

export default function PublicOpportunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isLoading: authLoading, onboardingStatus, session, user } = useAuth();
  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setOpportunity(await loadPublicOpportunityBySlug(slug));
    } catch (loadError) {
      setError(formatOpportunityError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading && !opportunity) {
    return <LoadingState message="Opening opportunity" />;
  }

  if (!opportunity) {
    return (
      <Screen centered contentStyle={styles.centered}>
        <View style={styles.emptyMark}>
          <Ionicons color={theme.colors.accentStrong} name="link-outline" size={28} />
        </View>
        <Text style={styles.emptyTitle}>This opportunity is not available.</Text>
        <Text style={styles.emptyBody}>
          It may have been closed, paused, archived, or moved by the creator.
        </Text>
        <Button label="Open Lance" onPress={() => router.replace('/')} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

  const mark = opportunity.poster.name.charAt(0).toUpperCase() || 'L';
  const warning = needsCompensationWarning(opportunity.compensationType);
  const workTypeLabel = getOptionLabel(workTypeOptions, opportunity.workType);
  const commitmentLabel = getOptionLabel(timeCommitmentOptions, opportunity.timeCommitment);
  const experienceLabel = getOptionLabel(
    opportunityExperienceOptions,
    opportunity.experienceLevel,
  );
  const arrangementLabel = getOptionLabel(workArrangementOptions, opportunity.workplace);
  const locationLabel = [opportunity.location, arrangementLabel].filter(Boolean).join(' / ');
  const deadlineLabel = opportunity.expirationDate
    ? formatDateLabel(opportunity.expirationDate)
    : 'Open until filled';

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={21} />
        </Pressable>
        <Text style={styles.brand}>Lance</Text>
        <Pressable
          accessibilityLabel="Share opportunity"
          accessibilityRole="button"
          onPress={() => setShareOpen(true)}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="share-outline" size={21} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <View style={styles.heroStripe} />
          <View style={styles.heroStripeSecondary} />
          <Text style={styles.heroInitial}>{mark}</Text>
          <View style={styles.posterImage}>
            {opportunity.poster.imageUrl ? (
              <Image
                contentFit={
                  opportunity.poster.identityType === 'business' ? 'contain' : 'cover'
                }
                source={opportunity.poster.imageUrl}
                style={styles.image}
              />
            ) : (
              <Text style={styles.posterInitial}>{mark}</Text>
            )}
          </View>
        </View>

        <View style={styles.heroCopy}>
          <View style={styles.heroTopline}>
            <View style={styles.openPill}>
              <View style={styles.openDot} />
              <Text style={styles.openPillText}>Open opportunity</Text>
            </View>
            <Text style={styles.deadlineText}>{deadlineLabel}</Text>
          </View>
          <View style={styles.posterRow}>
            <View style={styles.posterMini}>
              {opportunity.poster.imageUrl ? (
                <Image
                  contentFit="cover"
                  source={opportunity.poster.imageUrl}
                  style={styles.image}
                />
              ) : (
                <Text style={styles.posterMiniInitial}>{mark}</Text>
              )}
            </View>
            <View style={styles.posterText}>
              <Text numberOfLines={1} style={styles.posterName}>
                {opportunity.poster.name}
              </Text>
              <Text style={styles.posterType}>
                {opportunity.poster.identityType === 'business'
                  ? 'Creator business or project'
                  : 'Creator profile'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{opportunity.title}</Text>
          <Text style={styles.summary}>{opportunity.shortSummary}</Text>
          <View style={styles.badges}>
            <CompensationBadge
              compensationType={opportunity.compensationType}
              label={formatCompensation(opportunity)}
            />
            <WorkArrangementBadge
              label={getOptionLabel(workArrangementOptions, opportunity.workplace)}
            />
          </View>
          <View style={styles.heroMeta}>
            <HeroMeta icon="briefcase-outline" label={workTypeLabel} />
            <HeroMeta icon="time-outline" label={commitmentLabel} />
            <HeroMeta icon="location-outline" label={locationLabel || arrangementLabel} />
          </View>
        </View>
      </View>

      <View style={styles.applyCard}>
        <View style={styles.applyCopy}>
          <Text style={styles.applyTitle}>Apply with your Lance profile.</Text>
          <Text style={styles.applyBody}>
            Build it once, then reuse your skills, links, and portfolio for every
            opportunity.
          </Text>
        </View>
        <ApplyAction
          authLoading={authLoading}
          onError={setError}
          onboardingStatus={onboardingStatus}
          opportunity={opportunity}
          sessionExists={Boolean(session)}
          userId={user?.id ?? null}
        />
      </View>

      {warning ? (
        <View style={styles.warning}>
          <Ionicons color="#9A5B00" name="warning-outline" size={19} />
          <Text style={styles.warningText}>
            This may not include guaranteed base pay. Review compensation terms before
            applying.
          </Text>
        </View>
      ) : null}

      <Section title="What you'll do">
        <Text style={styles.body}>{opportunity.fullDescription}</Text>
      </Section>

      {opportunity.additionalRequirements ? (
        <Section title="Who this is for">
          <Text style={styles.body}>{opportunity.additionalRequirements}</Text>
        </Section>
      ) : null}

      <Section title="Skills wanted">
        <View style={styles.skills}>
          {opportunity.skills.map((skill) => (
            <Chip key={skill.toLowerCase()} label={skill} />
          ))}
        </View>
      </Section>

      <Section title="Details">
        <View style={styles.detailGrid}>
          <Detail icon="cash-outline" label="Compensation" value={formatCompensation(opportunity)} />
          <Detail
            icon="location-outline"
            label="Location"
            value={locationLabel}
          />
          <Detail icon="time-outline" label="Commitment" value={commitmentLabel} />
          <Detail icon="briefcase-outline" label="Type" value={workTypeLabel} />
          <Detail icon="sparkles-outline" label="Experience" value={experienceLabel} />
          <Detail
            icon="people-outline"
            label="People needed"
            value={opportunity.peopleNeeded || '1'}
          />
        </View>
        <View style={styles.dateRows}>
          <DateDetail
            label="Start"
            value={
              opportunity.expectedStartDate
                ? formatDateLabel(opportunity.expectedStartDate)
                : 'Flexible'
            }
          />
          <DateDetail
            label="Deadline"
            value={deadlineLabel}
          />
        </View>
      </Section>

      <View style={styles.creatorCard}>
        <View style={styles.creatorImage}>
          {opportunity.poster.imageUrl ? (
            <Image contentFit="cover" source={opportunity.poster.imageUrl} style={styles.image} />
          ) : (
            <Text style={styles.creatorInitial}>{mark}</Text>
          )}
        </View>
        <View style={styles.creatorCopy}>
          <Text style={styles.creatorLabel}>Posted by</Text>
          <Text style={styles.creatorName}>{opportunity.poster.name}</Text>
          <Text style={styles.creatorBody}>
            Lance keeps the opportunity page polished and the applications together, so
            creators do not have to sort through scattered DMs.
          </Text>
        </View>
      </View>

      {opportunity.externalUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(opportunity.externalUrl)}
          style={({ pressed }) => [styles.externalLink, pressed && styles.pressed]}>
          <Text style={styles.externalText}>Open creator project link</Text>
          <Ionicons color={theme.colors.accentStrong} name="open-outline" size={18} />
        </Pressable>
      ) : null}

      <View style={styles.finalApplyCard}>
        <Text style={styles.finalApplyTitle}>Interested?</Text>
        <Text style={styles.finalApplyBody}>
          Apply with a reusable Lance profile so the creator can review your work,
          skills, and links in one place.
        </Text>
        <ApplyAction
          authLoading={authLoading}
          onError={setError}
          onboardingStatus={onboardingStatus}
          opportunity={opportunity}
          sessionExists={Boolean(session)}
          userId={user?.id ?? null}
        />
      </View>

      <Text style={styles.publicUrl}>{getOpportunityPublicUrl(opportunity)}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <OpportunityShareSheet
        onClose={() => setShareOpen(false)}
        opportunity={opportunity}
        visible={shareOpen}
      />
    </Screen>
  );
}

function HeroMeta({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  if (!label) return null;

  return (
    <View style={styles.heroMetaPill}>
      <Ionicons color={theme.colors.textSoft} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.heroMetaText}>
        {label}
      </Text>
    </View>
  );
}

function ApplyAction({
  authLoading,
  onError,
  onboardingStatus,
  opportunity,
  sessionExists,
  userId,
}: {
  authLoading: boolean;
  onError: (message: string | null) => void;
  onboardingStatus: 'complete' | 'incomplete' | 'loading';
  opportunity: OpportunityRecord;
  sessionExists: boolean;
  userId: string | null;
}) {
  if (authLoading || onboardingStatus === 'loading') {
    return (
      <Button
        disabled
        label="Checking profile"
        onPress={() => undefined}
        style={styles.applyButton}
      />
    );
  }

  if (!sessionExists) {
    return (
      <Button
        label="Apply with Lance"
        onPress={() => router.push('/signup')}
        style={styles.applyButton}
      />
    );
  }

  if (onboardingStatus !== 'complete') {
    return (
      <Button
        label="Finish profile"
        onPress={() => router.push('/onboarding')}
        style={styles.applyButton}
      />
    );
  }

  if (opportunity.ownerProfileId === userId) {
    return (
      <Button
        disabled
        label="Your opportunity"
        onPress={() => undefined}
        style={styles.applyButton}
      />
    );
  }

  return (
    <View style={styles.applyButton}>
      <OpportunityInterestAction
        deferLoad
        onError={onError}
        opportunity={opportunity}
      />
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}>
        <Ionicons color={theme.colors.accentStrong} name={icon} size={17} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.detailValue}>
        {value || 'Not specified'}
      </Text>
    </View>
  );
}

function DateDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateDetail}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  brand: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  heroArt: {
    alignItems: 'center',
    backgroundColor: '#251F34',
    height: 190,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroStripe: {
    backgroundColor: theme.colors.accent,
    height: 330,
    opacity: 0.28,
    position: 'absolute',
    right: '22%',
    transform: [{ rotate: '22deg' }],
    width: 105,
  },
  heroStripeSecondary: {
    backgroundColor: '#FF7A59',
    height: 250,
    left: '12%',
    opacity: 0.16,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
    width: 78,
  },
  heroInitial: {
    color: 'rgba(255,255,255,0.14)',
    fontSize: 138,
    fontWeight: '900',
  },
  posterImage: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.78)',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    height: 118,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: theme.spacing.md,
    position: 'absolute',
    width: 118,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  posterInitial: {
    color: theme.colors.accentStrong,
    fontSize: 44,
    fontWeight: '900',
  },
  heroCopy: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  heroTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  openPill: {
    alignItems: 'center',
    backgroundColor: '#EAF8EF',
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openDot: {
    backgroundColor: theme.colors.success,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  openPillText: {
    color: '#13733A',
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  deadlineText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    textAlign: 'right',
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  posterMini: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  posterMiniInitial: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  posterText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  posterName: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  posterType: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  summary: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.bodySmall,
    lineHeight: 22,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  heroMetaPill: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroMetaText: {
    color: theme.colors.textSoft,
    flexShrink: 1,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  applyCard: {
    backgroundColor: '#17151F',
    borderRadius: theme.radii.lg,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  applyCopy: {
    gap: theme.spacing.xs,
  },
  applyTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  applyBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  applyButton: {
    width: '100%',
  },
  warning: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF5E8',
    borderColor: '#F2D7AA',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  warningText: {
    color: '#7D4B00',
    flex: 1,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '900',
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.bodySmall,
    lineHeight: 23,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detail: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    minHeight: 112,
    padding: theme.spacing.md,
    width: '48.5%',
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '900',
    lineHeight: 19,
  },
  dateRows: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dateDetail: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    flex: 1,
    gap: 4,
    padding: theme.spacing.md,
  },
  dateLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  dateValue: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  creatorCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  creatorImage: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  creatorInitial: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  creatorCopy: {
    flex: 1,
    gap: 3,
  },
  creatorLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  creatorName: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  creatorBody: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  externalLink: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
  },
  externalText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  finalApplyCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  finalApplyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  finalApplyBody: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  publicUrl: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.pill,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
