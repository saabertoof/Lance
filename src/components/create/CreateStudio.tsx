import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { theme } from '@/constants/theme';
import { slugify } from '@/lib/business';
import {
  formatCompensation,
  formatOpportunityLocation,
} from '@/lib/opportunity';
import type {
  CreateStudioBusiness,
  CreateStudioDraft,
  CreateStudioOpportunity,
} from '@/lib/createStudio';
import type { BusinessStatus } from '@/types/business';
import {
  workTypeOptions,
  type OpportunityDraft,
  type OpportunityStatus,
} from '@/types/opportunity';

import { OpportunityLinkPreviewCard } from './OpportunityLinkPreviewCard';

type IconName = keyof typeof Ionicons.glyphMap;

export function CreatePathGrid({
  onBusiness,
  onOpportunity,
  onProject,
  reduceMotion,
}: {
  onBusiness: () => void;
  onOpportunity: () => void;
  onProject: () => void;
  reduceMotion: boolean;
}) {
  const { width } = useWindowDimensions();
  const stackSecondary = width < 360;

  return (
    <View style={styles.pathGrid}>
      <CreatePathCard
        accessibilityHint="Opens the existing guided opportunity creation flow."
        delay={40}
        description="Projects, gigs, collabs, internships, and creator work all start here."
        icon="briefcase-outline"
        metadata="Create the link, then share it anywhere"
        onPress={onOpportunity}
        primary
        reduceMotion={reduceMotion}
        title="Make an opportunity link"
        tone="opportunity"
      />
      <View
        style={[
          styles.secondaryPaths,
          stackSecondary && styles.secondaryPathsStacked,
        ]}>
        <CreatePathCard
          accessibilityHint="Opens the business and project form with Project selected."
          delay={110}
          description="Only if the idea needs its own logo, page, and identity."
          icon="rocket-outline"
          onPress={onProject}
          reduceMotion={reduceMotion}
          title="Project profile"
          tone="project"
        />
        <CreatePathCard
          accessibilityHint="Opens the business and project form with Startup selected."
          delay={180}
          description="Post links as a brand instead of your personal profile."
          icon="business-outline"
          onPress={onBusiness}
          reduceMotion={reduceMotion}
          title="Business profile"
          tone="business"
        />
      </View>
    </View>
  );
}

export function PromptLinkBuilder({
  onDraft,
  onPromptChange,
  onUseExample,
  posterImageUrl,
  posterName,
  previewDraft,
  prompt,
  reduceMotion,
}: {
  onDraft: () => void;
  onPromptChange: (value: string) => void;
  onUseExample: (value: string) => void;
  posterImageUrl: string | null;
  posterName: string;
  previewDraft: OpportunityDraft;
  prompt: string;
  reduceMotion: boolean;
}) {
  const promptReady = prompt.trim().length >= 12;
  const urlSlug = slugify(previewDraft.title).slice(0, 48) || 'your-opportunity';

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(260)}
      style={styles.builder}>
      <View style={styles.builderHeader}>
        <View style={styles.builderCopy}>
          <Text style={styles.builderEyebrow}>Opportunity link maker</Text>
          <Text style={styles.builderTitle}>Describe what you need.</Text>
          <Text style={styles.builderBody}>
            Lance turns the rough idea into a draft link you can edit, publish,
            and share anywhere.
          </Text>
        </View>
        <View style={styles.builderIcon}>
          <Ionicons color={theme.colors.accentStrong} name="sparkles-outline" size={20} />
        </View>
      </View>

      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={onPromptChange}
          placeholder="Need a short-form editor for my YouTube clips, paid per video, remote, CapCut preferred..."
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.promptInput}
          textAlignVertical="top"
          value={prompt}
        />
        <View style={styles.composerFooter}>
          <Text style={styles.composerHint}>
            No AI call yet. This creates an editable smart starter draft.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!promptReady}
            onPress={onDraft}
            style={({ pressed }) => [
              styles.draftButton,
              !promptReady && styles.draftButtonDisabled,
              pressed && promptReady && styles.pathPressed,
            ]}>
            <Text style={styles.draftButtonText}>Draft link</Text>
            <Ionicons color={theme.colors.white} name="arrow-forward" size={15} />
          </Pressable>
        </View>
      </View>

      <View style={styles.examples}>
        {promptExamples.map((example) => (
          <Pressable
            accessibilityRole="button"
            key={example}
            onPress={() => onUseExample(example)}
            style={({ pressed }) => [styles.exampleChip, pressed && styles.rowPressed]}>
            <Text numberOfLines={1} style={styles.exampleText}>{example}</Text>
          </Pressable>
        ))}
      </View>

      <OpportunityLinkPreviewCard
        compensationLabel={formatCompensation(previewDraft)}
        locationLabel={formatOpportunityLocation(previewDraft)}
        posterImageUrl={posterImageUrl}
        posterLabel={posterName}
        skills={previewDraft.skills}
        summary={previewDraft.shortSummary}
        title={previewDraft.title}
        urlLabel={`lance.app/o/${urlSlug}`}
      />
    </Animated.View>
  );
}

function CreatePathCard({
  accessibilityHint,
  delay,
  description,
  icon,
  metadata,
  onPress,
  primary,
  reduceMotion,
  title,
  tone,
}: {
  accessibilityHint: string;
  delay: number;
  description: string;
  icon: IconName;
  metadata?: string;
  onPress: () => void;
  primary?: boolean;
  reduceMotion: boolean;
  title: string;
  tone: 'business' | 'opportunity' | 'project';
}) {
  const palette = pathPalettes[tone];

  return (
    <Animated.View
      entering={
        reduceMotion ? undefined : FadeInDown.delay(delay).duration(320)
      }
      style={primary ? styles.primaryPathWrap : styles.secondaryPathWrap}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.pathCard,
          primary ? styles.primaryPath : styles.secondaryPath,
          { backgroundColor: palette.background },
          pressed && styles.pathPressed,
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.artPanel,
            primary ? styles.primaryArtPanel : styles.secondaryArtPanel,
            { borderColor: palette.art },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.artLine,
            primary ? styles.primaryArtLine : styles.secondaryArtLine,
            { backgroundColor: palette.art },
          ]}
        />
        <View style={[styles.pathIcon, { backgroundColor: palette.iconSurface }]}>
          <Ionicons color={palette.accent} name={icon} size={primary ? 27 : 23} />
        </View>
        <View style={styles.pathCopy}>
          <Text
            numberOfLines={2}
            style={[
              styles.pathTitle,
              primary && styles.primaryPathTitle,
              { color: palette.text },
            ]}>
            {title}
          </Text>
          <Text
            numberOfLines={primary ? 2 : 3}
            style={[styles.pathDescription, { color: palette.muted }]}>
            {description}
          </Text>
          {metadata ? (
            <Text numberOfLines={1} style={[styles.pathMeta, { color: palette.muted }]}>
              {metadata}
            </Text>
          ) : null}
        </View>
        <View style={[styles.pathArrow, { borderColor: palette.arrowBorder }]}>
          <Ionicons color={palette.accent} name="arrow-forward" size={18} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function DraftContinuation({
  drafts,
  onOpen,
}: {
  drafts: CreateStudioDraft[];
  onOpen: (id: string) => void;
}) {
  if (drafts.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Continue where you left off</Text>
      <ScrollView
        contentContainerStyle={styles.draftRail}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {drafts.map((draft) => (
          <Pressable
            accessibilityHint="Continues editing this saved opportunity draft."
            accessibilityLabel={`${draft.title}, draft`}
            accessibilityRole="button"
            key={draft.id}
            onPress={() => onOpen(draft.id)}
            style={({ pressed }) => [
              styles.draftCard,
              pressed && styles.rowPressed,
            ]}>
            <View style={styles.draftTop}>
              <View style={styles.draftIcon}>
                <Ionicons
                  color={theme.colors.accentStrong}
                  name="document-text-outline"
                  size={20}
                />
              </View>
              <View style={styles.draftStatus}>
                <Text style={styles.draftStatusText}>Draft</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.draftTitle}>
              {draft.title}
            </Text>
            <Text numberOfLines={1} style={styles.draftMeta}>
              {optionLabel(workTypeOptions, draft.workType)} |{' '}
              {relativeDate(draft.updatedAt)}
            </Text>
            <View style={styles.continueRow}>
              <Text style={styles.continueLabel}>Continue</Text>
              <Ionicons
                color={theme.colors.accentStrong}
                name="arrow-forward"
                size={17}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function YourCreations({
  businesses,
  onBusiness,
  onOpportunity,
  onManageBusinesses,
  onManageOpportunities,
  opportunities,
}: {
  businesses: CreateStudioBusiness[];
  onBusiness: (id: string) => void;
  onOpportunity: (id: string) => void;
  onManageBusinesses: () => void;
  onManageOpportunities: () => void;
  opportunities: CreateStudioOpportunity[];
}) {
  const items = useMemo(() => {
    const opportunityItems = opportunities.map((item) => ({
      id: item.id,
      imageUrl: null,
      kind: 'opportunity' as const,
      label: 'Opportunity',
      status: item.status,
      title: item.title,
      updatedAt: item.updatedAt,
    }));
    const organizations = businesses.map((item) => ({
      id: item.id,
      imageUrl: item.logoUrl,
      kind: 'business' as const,
      label: item.businessType === 'project' ? 'Project' : 'Business',
      status: item.status,
      title: item.name,
      updatedAt: item.updatedAt,
    }));

    return [...opportunityItems, ...organizations]
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      )
      .slice(0, 6);
  }, [businesses, opportunities]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your creations</Text>
      {items.length > 0 ? (
        <View style={styles.creationList}>
          {items.map((item) => (
            <CreationRow
              imageUrl={item.imageUrl}
              key={`${item.kind}:${item.id}`}
              kind={item.kind}
              label={item.label}
              onPress={() =>
                item.kind === 'opportunity' ? onOpportunity(item.id) : onBusiness(item.id)
              }
              status={item.status}
              title={item.title}
              updatedAt={item.updatedAt}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyCreations}>
          Your opportunities, projects, and businesses will appear here.
        </Text>
      )}
      <View style={styles.manageRow}>
        <ManageButton
          icon="briefcase-outline"
          label="Opportunities"
          onPress={onManageOpportunities}
        />
        <ManageButton
          icon="business-outline"
          label="Businesses"
          onPress={onManageBusinesses}
        />
      </View>
    </View>
  );
}

function CreationRow({
  imageUrl,
  kind,
  label,
  onPress,
  status,
  title,
  updatedAt,
}: {
  imageUrl: string | null;
  kind: 'business' | 'opportunity';
  label: string;
  onPress: () => void;
  status: BusinessStatus | OpportunityStatus;
  title: string;
  updatedAt: string;
}) {
  const statusTone = creationStatusTone(status);

  return (
    <Pressable
      accessibilityLabel={`${title}, ${label}, ${statusLabel(status)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.creationRow,
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.creationIdentity}>
        {imageUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={imageUrl}
            source={imageUrl}
            style={styles.creationImage}
          />
        ) : (
          <Ionicons
            color={theme.colors.accentStrong}
            name={kind === 'opportunity' ? 'briefcase-outline' : 'business-outline'}
            size={20}
          />
        )}
      </View>
      <View style={styles.creationCopy}>
        <Text numberOfLines={1} style={styles.creationTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.creationMeta}>
          {label} | Updated {relativeDate(updatedAt)}
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusTone.background }]}>
        <Text style={[styles.statusText, { color: statusTone.text }]}>
          {statusLabel(status)}
        </Text>
      </View>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={17} />
    </Pressable>
  );
}

function ManageButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageButton,
        pressed && styles.rowPressed,
      ]}>
      <Ionicons color={theme.colors.text} name={icon} size={18} />
      <Text style={styles.manageLabel}>{label}</Text>
      <Ionicons color={theme.colors.muted} name="arrow-forward" size={16} />
    </Pressable>
  );
}

export function CreateStudioSkeleton() {
  return (
    <View style={styles.skeletonSection}>
      <View style={[styles.skeletonLine, { width: 150 }]} />
      {[0, 1].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeletonLine, { width: '58%' }]} />
            <View style={[styles.skeletonLine, { width: '82%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function optionLabel<T extends string>(
  options: readonly { label: string; value: T }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function statusLabel(status: BusinessStatus | OpportunityStatus) {
  if (status === 'published') return 'Live';
  return status.replace(/^\w/, (letter) => letter.toUpperCase());
}

function creationStatusTone(status: BusinessStatus | OpportunityStatus) {
  if (status === 'published' || status === 'active') {
    return { background: '#E7F7ED', text: '#15733C' };
  }
  if (status === 'paused') {
    return { background: '#FFF4D8', text: '#7C5711' };
  }
  return { background: theme.colors.surfaceMuted, text: theme.colors.muted };
}

function relativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'recently';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

const pathPalettes = {
  opportunity: {
    accent: theme.colors.white,
    arrowBorder: 'rgba(255,255,255,0.3)',
    art: 'rgba(255,255,255,0.18)',
    background: '#5B3EEB',
    iconSurface: 'rgba(255,255,255,0.16)',
    muted: 'rgba(255,255,255,0.78)',
    text: theme.colors.white,
  },
  project: {
    accent: '#B54C39',
    arrowBorder: 'rgba(181,76,57,0.2)',
    art: 'rgba(181,76,57,0.14)',
    background: '#FFF0EA',
    iconSurface: 'rgba(181,76,57,0.11)',
    muted: '#72534D',
    text: '#351E1B',
  },
  business: {
    accent: '#2F65C8',
    arrowBorder: 'rgba(47,101,200,0.2)',
    art: 'rgba(47,101,200,0.13)',
    background: '#EAF2FF',
    iconSurface: 'rgba(47,101,200,0.11)',
    muted: '#50617C',
    text: '#15233B',
  },
};

const promptExamples = [
  'Need a short-form editor for YouTube clips, paid per video, remote',
  'Looking for a cofounder-type builder to help prototype a creator app',
  'Need someone to run TikTok growth for a small brand launch',
];

const styles = StyleSheet.create({
  builder: {
    gap: theme.spacing.md,
  },
  builderHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  builderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  builderEyebrow: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  builderTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
    lineHeight: 26,
  },
  builderBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20,
  },
  builderIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  composer: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  promptInput: {
    color: theme.colors.text,
    fontSize: theme.typography.bodySmall,
    lineHeight: 21,
    minHeight: 96,
    padding: 0,
  },
  composerFooter: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  composerHint: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    lineHeight: 15,
  },
  draftButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
  },
  draftButtonDisabled: {
    opacity: 0.42,
  },
  draftButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exampleChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    maxWidth: '100%',
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  exampleText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  pathGrid: {
    gap: theme.spacing.sm,
  },
  primaryPathWrap: {
    width: '100%',
  },
  secondaryPaths: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryPathsStacked: {
    flexDirection: 'column',
  },
  secondaryPathWrap: {
    flex: 1,
  },
  pathCard: {
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryPath: {
    minHeight: 148,
    padding: theme.spacing.lg,
  },
  secondaryPath: {
    minHeight: 132,
    padding: theme.spacing.md,
  },
  pathPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }, { translateY: 1 }],
  },
  artPanel: {
    borderWidth: 18,
    position: 'absolute',
    transform: [{ rotate: '24deg' }],
  },
  primaryArtPanel: {
    height: 150,
    right: -34,
    top: -42,
    width: 86,
  },
  secondaryArtPanel: {
    height: 112,
    right: -44,
    top: -40,
    width: 70,
  },
  artLine: {
    height: 3,
    position: 'absolute',
    transform: [{ rotate: '-18deg' }],
  },
  primaryArtLine: {
    right: -8,
    top: 74,
    width: 120,
  },
  secondaryArtLine: {
    right: -12,
    top: 62,
    width: 88,
  },
  pathIcon: {
    alignItems: 'center',
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pathCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    paddingRight: theme.spacing.xl,
  },
  pathTitle: {
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
    lineHeight: 20,
  },
  primaryPathTitle: {
    fontSize: theme.typography.subheading,
    lineHeight: 23,
  },
  pathDescription: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  pathMeta: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  pathArrow: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    bottom: theme.spacing.md,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: theme.spacing.md,
    width: 38,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
  },
  draftRail: {
    gap: theme.spacing.sm,
    paddingRight: theme.layout.screenPadding,
  },
  draftCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    minHeight: 154,
    padding: theme.spacing.md,
    width: 268,
  },
  draftTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  draftIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  draftStatus: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  draftStatusText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  draftTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: theme.spacing.md,
  },
  draftMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.label,
    marginTop: theme.spacing.xs,
  },
  continueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: 'auto',
    minHeight: 32,
  },
  continueLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  creationList: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  creationRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 68,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  creationIdentity: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  creationImage: {
    height: '100%',
    width: '100%',
  },
  creationCopy: {
    flex: 1,
    minWidth: 0,
  },
  creationTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  creationMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    marginTop: 3,
  },
  statusChip: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyCreations: {
    color: theme.colors.muted,
    fontSize: theme.typography.bodySmall,
    lineHeight: 20,
  },
  manageRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  manageButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  manageLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.label,
    fontWeight: '800',
  },
  rowPressed: {
    opacity: 0.68,
  },
  skeletonSection: {
    gap: theme.spacing.md,
  },
  skeletonRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 68,
    padding: theme.spacing.md,
  },
  skeletonIcon: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    height: 40,
    width: 40,
  },
  skeletonCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  skeletonLine: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 5,
    height: 11,
  },
});
