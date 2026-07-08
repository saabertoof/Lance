import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OpportunityInterestAction } from '@/components/communication';
import {
  CompensationBadge,
  OpportunityShareSheet,
  WorkArrangementBadge,
} from '@/components/opportunity';
import { Button, Chip, LoadingState, Screen } from '@/components/ui';
import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';
import { type OnboardingStatus, useAuth } from '@/context/AuthContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';
import { formatDateLabel } from '@/lib/date';
import { openExternalUrl } from '@/lib/externalLinks';
import {
  formatCompensation,
  formatOpportunityError,
  formatOpportunityLocation,
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
  const {
    isLoading: authLoading,
    onboardingStatus,
    refreshProfileStatus,
    session,
    user,
  } = useAuth();
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
      const message = formatOpportunityError(loadError);
      setError(
        message === 'This opportunity link is not valid.' ||
          message === 'This opportunity is no longer available.'
          ? message
          : 'This opportunity could not be loaded. Check your connection and try again.',
      );
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
    const unavailable =
      error === 'This opportunity link is not valid.' ||
      error === 'This opportunity is no longer available.';

    return (
      <Screen centered contentStyle={styles.centered}>
        <View style={styles.emptyMark}>
          <Ionicons color={theme.colors.accentStrong} name="link-outline" size={28} />
        </View>
        <Text style={styles.emptyTitle}>
          {unavailable
            ? 'This opportunity is not available.'
            : 'We could not open this opportunity.'}
        </Text>
        <Text style={styles.emptyBody}>
          {unavailable
            ? 'It may have been closed, paused, archived, or moved by the creator.'
            : 'Check your connection, then try the link again.'}
        </Text>
        {unavailable ? (
          <Button label="Open Lance" onPress={() => router.replace('/')} />
        ) : (
          <View style={styles.emptyActions}>
            <Button label="Try again" onPress={() => void load()} />
            <Button
              label="Open Lance"
              onPress={() => router.replace('/')}
              variant="secondary"
            />
          </View>
        )}
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
  const locationLabel = formatOpportunityLocation(opportunity);
  const deadlineLabel = opportunity.expirationDate
    ? formatDateLabel(opportunity.expirationDate)
    : 'Open until filled';

  return (
    <Screen scroll contentStyle={styles.screen} style={styles.canvas}>
      <Head>
        <title>{`${opportunity.title} | Lance`}</title>
        <meta content={opportunity.shortSummary} name="description" />
        <meta content={opportunity.title} property="og:title" />
        <meta content={opportunity.shortSummary} property="og:description" />
        <meta content="website" property="og:type" />
        <meta content={getOpportunityPublicUrl(opportunity)} property="og:url" />
        {opportunity.poster.imageUrl ? (
          <meta content={opportunity.poster.imageUrl} property="og:image" />
        ) : null}
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={opportunity.title} name="twitter:title" />
        <meta content={opportunity.shortSummary} name="twitter:description" />
      </Head>
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
                  ? 'Creator business profile'
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
          onRetryProfile={refreshProfileStatus}
          opportunity={opportunity}
          sessionExists={Boolean(session)}
          userId={user?.id ?? null}
        />
      </View>

      {warning ? (
        <View style={styles.warning}>
          <Ionicons color="#F4BE65" name="warning-outline" size={19} />
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
          onPress={() =>
            void openExternalUrl(opportunity.externalUrl, {
              label: 'Creator link',
              onError: setError,
            })
          }
          style={({ pressed }) => [styles.externalLink, pressed && styles.pressed]}>
          <Text style={styles.externalText}>Open creator link</Text>
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
          onRetryProfile={refreshProfileStatus}
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
  onRetryProfile,
  opportunity,
  sessionExists,
  userId,
}: {
  authLoading: boolean;
  onError: (message: string | null) => void;
  onboardingStatus: OnboardingStatus;
  onRetryProfile: () => Promise<OnboardingStatus>;
  opportunity: OpportunityRecord;
  sessionExists: boolean;
  userId: string | null;
}) {
  const nextPath = normalizeInternalNext(`/o/${opportunity.slug}`);

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
        onPress={() => router.push(authRoute('/signup', nextPath))}
        style={styles.applyButton}
      />
    );
  }

  if (onboardingStatus === 'error') {
    return (
      <Button
        label="Retry profile check"
        onPress={() => void onRetryProfile()}
        style={styles.applyButton}
        variant="secondary"
      />
    );
  }

  if (onboardingStatus !== 'complete') {
    return (
      <Button
        label="Finish profile"
        onPress={() => router.push(authRoute('/onboarding', nextPath))}
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
  canvas: {
    backgroundColor: v.background,
  },
  screen: {
    gap: 18,
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: 16,
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
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderColor: v.borderPurple,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  heroArt: {
    alignItems: 'center',
    backgroundColor: '#12111A',
    height: 164,
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
    borderRadius: 24,
    borderWidth: 1,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: theme.spacing.md,
    position: 'absolute',
    width: 104,
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
    gap: 12,
    padding: 16,
  },
  heroTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  openPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(52,216,112,0.12)',
    borderColor: 'rgba(52,216,112,0.22)',
    borderWidth: 1,
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
    color: theme.colors.success,
    fontSize: theme.typography.caption,
    fontFamily: theme.typography.familyMonoSemiBold,
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
    fontFamily: theme.typography.familySemiBold,
  },
  posterText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  posterName: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  posterType: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 29,
  },
  summary: {
    color: theme.colors.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
    lineHeight: 20,
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
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: 16,
    ...theme.shadows.card,
  },
  applyCopy: {
    gap: theme.spacing.xs,
  },
  applyTitle: {
    color: theme.colors.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.22)',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  warningText: {
    color: '#F4BE65',
    flex: 1,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    borderRadius: 14,
    borderWidth: 1,
    gap: theme.spacing.sm,
    minHeight: 98,
    padding: 12,
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
    fontFamily: operatorFonts.monoSemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: theme.colors.text,
    fontFamily: operatorFonts.sansMedium,
    fontSize: theme.typography.small,
    fontWeight: '500',
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
    borderRadius: 16,
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
    fontFamily: operatorFonts.monoSemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  creatorName: {
    color: theme.colors.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
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
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  finalApplyTitle: {
    color: theme.colors.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
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
  emptyActions: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
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
