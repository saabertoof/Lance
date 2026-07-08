import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OpportunityCard } from '@/components/opportunity';
import { SafetySheet } from '@/components/communication';
import { Button, Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { archiveBusiness, formatBusinessError, loadBusiness } from '@/lib/business';
import { openExternalUrl } from '@/lib/externalLinks';
import { loadBusinessOpportunities } from '@/lib/opportunity';
import { getBusinessPublicUrl } from '@/lib/publicLinks';
import { routes } from '@/lib/routes';
import {
  formatCommunicationError,
  loadRelationshipStatus,
} from '@/lib/communication';
import {
  businessRemoteOptions,
  businessSizeOptions,
  businessTypeOptions,
  BusinessRecord,
} from '@/types/business';
import type { OpportunityRecord } from '@/types/opportunity';
import type { RelationshipStatus } from '@/types/communication';
import { getOptionLabel } from '@/types/profile';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const archiveRef = useRef(false);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [ownerRelationship, setOwnerRelationship] =
    useState<RelationshipStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusiness(null);
    setOpportunities([]);
    setOwnerRelationship(null);
    setSafetyOpen(false);
    setError(null);
    setIsLoading(true);
  }, [id]);

  useEffect(() => {
    let active = true;

    Promise.all([loadBusiness(id), loadBusinessOpportunities(id)])
      .then(([businessResult, opportunityResult]) => {
        if (active) {
          setBusiness(businessResult);
          setOpportunities(opportunityResult);
        }
      })
      .catch((loadError) => {
        if (active) setError(formatBusinessError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!business || business.ownerProfileId === user?.id) return;
    let active = true;
    loadRelationshipStatus(business.ownerProfileId)
      .then((result) => {
        if (active) setOwnerRelationship(result);
      })
      .catch((loadError) => {
        if (active) setError(formatCommunicationError(loadError));
      });
    return () => {
      active = false;
    };
  }, [business, user?.id]);

  if (isLoading) return <LoadingState message="Loading business" />;
  if (!business) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'The business could not be loaded.'}</Text>
        <Button
          label="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          variant="secondary"
        />
      </Screen>
    );
  }

  const isOwner = business.ownerProfileId === user?.id;
  const businessId = business.id;
  const links = [
    ['Website', business.websiteUrl],
    ['Instagram', business.instagramUrl],
    ['TikTok', business.tiktokUrl],
    ['X', business.xUrl],
    ['LinkedIn', business.linkedinUrl],
    ['GitHub', business.githubUrl],
  ].filter((link): link is [string, string] => Boolean(link[1]));

  function confirmArchive() {
    Alert.alert(
      'Archive business?',
      'It will no longer be publicly visible. Existing opportunities remain manageable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            if (!user || archiveRef.current) return;
            archiveRef.current = true;
            setIsArchiving(true);
            try {
              await archiveBusiness(businessId, user.id);
              showSuccess('Business archived.');
              router.replace(routes.businesses);
            } catch (archiveError) {
              setError(formatBusinessError(archiveError));
            } finally {
              archiveRef.current = false;
              setIsArchiving(false);
            }
          },
        },
      ],
    );
  }

  async function shareBusiness(currentBusiness: BusinessRecord) {
    try {
      await Share.share({
        message: `View ${currentBusiness.name} on Lance: ${getBusinessPublicUrl(currentBusiness)}`,
      });
    } catch {
      showWarning('This business profile could not be shared. Try again.');
    }
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.topActions}>
          {!isOwner ? (
            <Pressable
              accessibilityLabel="Business safety options"
              onPress={() => setSafetyOpen(true)}
              style={styles.iconButton}>
              <Ionicons
                color={theme.colors.text}
                name="ellipsis-horizontal"
                size={22}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Share business"
            accessibilityRole="button"
            onPress={() => void shareBusiness(business)}
            style={styles.iconButton}>
            <Ionicons color={theme.colors.text} name="share-outline" size={22} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.logo}>
          {business.logoUrl ? (
            <Image contentFit="cover" source={business.logoUrl} style={styles.image} />
          ) : (
            <Text style={styles.mark}>{business.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.name}>{business.name}</Text>
        <Text style={styles.type}>
          {getOptionLabel(businessTypeOptions, business.businessType)}
        </Text>
        <Text style={styles.short}>{business.shortDescription}</Text>
        <View style={styles.chips}>
          <Chip accent label={business.industry} />
          <Chip label={getOptionLabel(businessSizeOptions, business.businessSize)} />
          <Chip label={getOptionLabel(businessRemoteOptions, business.remoteStatus)} />
        </View>
      </View>

      {business.fullDescription ? (
        <Section title="About">
          <Text style={styles.body}>{business.fullDescription}</Text>
        </Section>
      ) : null}

      <Section title="Details">
        <Detail label="Location" value={business.location || 'Not specified'} />
        <Detail
          label="Founded"
          value={business.foundingYear?.toString() ?? 'Not specified'}
        />
        <Detail label="Managed by" value={business.managedByName} />
        {business.contactEmail ? <Detail label="Contact" value={business.contactEmail} /> : null}
      </Section>

      {links.length > 0 ? (
        <Section title="Links">
          {links.map(([label, url]) => (
            <Pressable
              accessibilityRole="link"
              key={label}
              onPress={() =>
                void openExternalUrl(url, {
                  label,
                  onError: showWarning,
                })
              }
              style={styles.link}>
              <Text style={styles.linkLabel}>{label}</Text>
              <Ionicons color={theme.colors.muted} name="open-outline" size={18} />
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section title="Active opportunities">
        {opportunities.length > 0 ? (
          <View style={styles.list}>
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                onPress={() => router.push(routes.opportunity(opportunity.id))}
                opportunity={opportunity}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No published opportunities right now.</Text>
        )}
      </Section>

      {isOwner ? (
        <Section title="Interested talent">
          <Text style={styles.muted}>
            People who express interest in your opportunities will appear here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.interestedTalent(business.id))}
            style={({ pressed }) => [styles.interestCard, pressed && styles.pressed]}>
            <View style={styles.interestIcon}>
              <Ionicons
                color={theme.colors.accentStrong}
                name="people-outline"
                size={22}
              />
            </View>
            <Text style={styles.interestLabel}>View interested talent</Text>
            <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
          </Pressable>
        </Section>
      ) : null}

      {isOwner ? (
        <View style={styles.ownerActions}>
          {business.status === 'active' ? (
            <>
              <Button
                label="Create opportunity"
                onPress={() => router.push(routes.newOpportunity(business.id))}
              />
              <Button
                label="Edit business"
                onPress={() => router.push(routes.editBusiness(business.id))}
                variant="secondary"
              />
              <Button
                label="Archive business"
                loading={isArchiving}
                onPress={confirmArchive}
                variant="danger"
              />
            </>
          ) : (
            <Text style={styles.muted}>This business is archived and read-only.</Text>
          )}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!isOwner ? (
        <SafetySheet
          blockedByMe={Boolean(ownerRelationship?.blockedByMe)}
          onClose={() => setSafetyOpen(false)}
          onStateChange={() =>
            void loadRelationshipStatus(business.ownerProfileId).then(
              setOwnerRelationship,
            )
          }
          profileId={business.ownerProfileId}
          targetId={business.id}
          targetKind="business"
          visible={safetyOpen}
        />
      ) : null}
    </Screen>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.xl,
    height: 104,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    width: 104,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.title,
    fontWeight: '900',
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  type: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  short: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 24,
    maxWidth: 360,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  section: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  body: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 25,
  },
  detail: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '700',
    textAlign: 'right',
  },
  link: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: theme.layout.minTouchTarget,
  },
  linkLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  list: {
    gap: theme.spacing.md,
  },
  muted: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  ownerActions: {
    gap: theme.spacing.md,
  },
  interestCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 64,
    padding: theme.spacing.md,
  },
  interestIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  interestLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.small,
    lineHeight: 20,
    textAlign: 'center',
  },
});
