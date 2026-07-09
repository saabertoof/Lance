import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
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

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
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
import { OpportunitySharePoster } from './OpportunitySharePoster';

type IconName = keyof typeof Ionicons.glyphMap;

const maxPromptLength = 1500;

export function CreatePathGrid({
  draftCount,
  onBusiness,
  onDrafts,
  onMagicDraft,
  onOpportunity,
  reduceMotion,
}: {
  draftCount: number;
  onBusiness: () => void;
  onDrafts: () => void;
  onMagicDraft: () => void;
  onOpportunity: () => void;
  reduceMotion: boolean;
}) {
  const { width } = useWindowDimensions();
  const stackActions = width < 365;
  const compactActions = width < 430;

  return (
    <View style={styles.quickSection}>
      <SectionLabel>Quick actions</SectionLabel>
      <View style={[styles.actionGrid, stackActions && styles.actionGridStacked]}>
        <ActionTile
          delay={40}
          compact={compactActions}
          icon="paper-plane-outline"
          label="New opportunity"
          onPress={onOpportunity}
          reduceMotion={reduceMotion}
          supporting="Open the full editor"
        />
        <ActionTile
          delay={90}
          compact={compactActions}
          icon="sparkles-outline"
          label="Magic draft"
          onPress={onMagicDraft}
          reduceMotion={reduceMotion}
          supporting="Seed the composer"
        />
        <ActionTile
          delay={140}
          compact={compactActions}
          icon="business-outline"
          label="Business profile"
          onPress={onBusiness}
          reduceMotion={reduceMotion}
          supporting="Post as a brand"
        />
        <ActionTile
          badge={draftCount > 0 ? String(Math.min(draftCount, 99)) : undefined}
          compact={compactActions}
          delay={190}
          icon="document-text-outline"
          label="Drafts"
          onPress={onDrafts}
          reduceMotion={reduceMotion}
          supporting={draftCount > 0 ? 'Continue saved drafts' : 'No drafts yet'}
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
  const [previewMode, setPreviewMode] = useState<'link' | 'social'>('link');
  const urlSlug = slugify(previewDraft.title).slice(0, 48) || 'your-opportunity';
  const urlLabel = `lance.app/o/${urlSlug}`;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(260)}
      style={styles.builder}>
      <View style={styles.heroHeader}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Post an opportunity</Text>
          <Text style={styles.heroSubtitle}>
            Find builders, operators, collaborators, and talent.
          </Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons color={v.purpleStrong} name="sparkles-outline" size={19} />
        </View>
      </View>

      <View style={styles.composer}>
        <View style={styles.composerHeader}>
          <View style={styles.composerLabelRow}>
            <View style={styles.tinyDot} />
            <Text style={styles.composerLabel}>Opportunity</Text>
          </View>
          <Text style={styles.countText}>{prompt.length}/{maxPromptLength}</Text>
        </View>
        <TextInput
          maxLength={maxPromptLength}
          multiline
          onChangeText={onPromptChange}
          placeholder="What are you building, and who do you need?"
          placeholderTextColor={v.muted}
          selectionColor={v.purple}
          style={styles.promptInput}
          textAlignVertical="top"
          value={prompt}
        />
        <View style={styles.composerFooter}>
          <View style={styles.composerTools}>
            <ToolButton icon="sparkles-outline" label="Local draft" />
            <ToolButton icon="link-outline" label="Shareable link" />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!promptReady}
            onPress={onDraft}
            style={({ pressed }) => [
              styles.previewButton,
              !promptReady && styles.previewButtonDisabled,
              pressed && promptReady && styles.pressed,
            ]}>
            <Text style={styles.previewButtonText}>Build draft</Text>
            <Ionicons color={v.purpleStrong} name="arrow-forward" size={16} />
          </Pressable>
        </View>
      </View>

      <View style={styles.quickStart}>
        <SectionLabel>Quick start</SectionLabel>
        <ScrollView
          contentContainerStyle={styles.exampleRail}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {promptExamples.map((example) => (
            <Pressable
              accessibilityRole="button"
              key={example.label}
              onPress={() => onUseExample(example.prompt)}
              style={({ pressed }) => [
                styles.exampleChip,
                pressed && styles.rowPressed,
              ]}>
              <Ionicons color={v.textSoft} name={example.icon} size={15} />
              <Text numberOfLines={1} style={styles.exampleText}>
                {example.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.previewSection}>
        <View style={styles.previewHeader}>
          <SectionLabel>Live preview</SectionLabel>
          <View accessibilityRole="tablist" style={styles.previewModes}>
            <PreviewModeButton
              active={previewMode === 'link'}
              label="Link"
              onPress={() => setPreviewMode('link')}
            />
            <PreviewModeButton
              active={previewMode === 'social'}
              label="Social"
              onPress={() => setPreviewMode('social')}
            />
          </View>
        </View>
        {previewMode === 'link' ? (
          <OpportunityLinkPreviewCard
            compensationLabel={formatCompensation(previewDraft)}
            locationLabel={formatOpportunityLocation(previewDraft)}
            posterImageUrl={posterImageUrl}
            posterLabel={posterName}
            skills={previewDraft.skills}
            summary={previewDraft.shortSummary}
            title={previewDraft.title}
            urlLabel={urlLabel}
          />
        ) : (
          <View style={styles.socialPreview}>
            <OpportunitySharePoster
              compensationLabel={formatCompensation(previewDraft)}
              locationLabel={formatOpportunityLocation(previewDraft)}
              posterImageUrl={posterImageUrl}
              posterLabel={posterName}
              skills={previewDraft.skills}
              summary={previewDraft.shortSummary}
              title={previewDraft.title}
              urlLabel={urlLabel}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function PreviewModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} preview`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.previewMode,
        active && styles.previewModeActive,
        pressed && styles.rowPressed,
      ]}>
      <Text style={[styles.previewModeText, active && styles.previewModeTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionTile({
  badge,
  compact,
  delay,
  icon,
  label,
  onPress,
  reduceMotion,
  supporting,
}: {
  badge?: string;
  compact: boolean;
  delay: number;
  icon: IconName;
  label: string;
  onPress: () => void;
  reduceMotion: boolean;
  supporting: string;
}) {
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(delay).duration(280)}
      style={styles.actionTileWrap}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}>
        <View style={styles.actionIcon}>
          <Ionicons color={v.purpleStrong} name={icon} size={21} />
        </View>
        <View style={styles.actionCopy}>
          <Text numberOfLines={2} style={styles.actionTitle}>
            {label}
          </Text>
          {!compact ? (
            <Text numberOfLines={1} style={styles.actionSupporting}>
              {supporting}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        ) : (
          <Ionicons color={v.textSoft} name="chevron-forward" size={17} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function ToolButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View accessibilityLabel={label} style={styles.toolButton}>
      <Ionicons color={v.textSoft} name={icon} size={15} />
    </View>
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
      <SectionLabel>Continue where you left off</SectionLabel>
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
                  color={v.purpleStrong}
                  name="document-text-outline"
                  size={18}
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
              {optionLabel(workTypeOptions, draft.workType)} · {relativeDate(draft.updatedAt)}
            </Text>
            <View style={styles.continueRow}>
              <Text style={styles.continueLabel}>Continue</Text>
              <Ionicons color={v.purpleStrong} name="arrow-forward" size={16} />
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
      label: 'Business profile',
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
      <View style={styles.sectionHeaderRow}>
        <SectionLabel>Your posts</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={onManageOpportunities}
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.rowPressed]}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons color={v.purpleStrong} name="chevron-forward" size={15} />
        </Pressable>
      </View>

      {items.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.creationRail}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {items.map((item) => (
            <CreationTile
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
        </ScrollView>
      ) : (
        <View style={styles.emptyCreationsCard}>
          <View style={styles.emptyIcon}>
            <Ionicons color={v.purpleStrong} name="paper-plane-outline" size={18} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyCreations}>
              Draft or publish your first opportunity and it will show up here.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.manageRow}>
        <ManageButton
          icon="briefcase-outline"
          label="Opportunities"
          onPress={onManageOpportunities}
        />
        <ManageButton
          icon="business-outline"
          label="Business profiles"
          onPress={onManageBusinesses}
        />
      </View>
    </View>
  );
}

function CreationTile({
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
      style={({ pressed }) => [styles.creationTile, pressed && styles.rowPressed]}>
      <View style={styles.creationTop}>
        <View style={styles.creationKind}>
          <View style={[styles.statusDot, { backgroundColor: statusTone.dot }]} />
          <Text style={[styles.creationKindText, { color: statusTone.text }]}>
            {statusLabel(status)}
          </Text>
        </View>
        <Ionicons color={v.textSoft} name="bookmark-outline" size={17} />
      </View>
      <View style={styles.creationBody}>
        {imageUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={imageUrl}
            source={imageUrl}
            style={styles.creationImage}
          />
        ) : null}
        <Text numberOfLines={2} style={styles.creationTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.creationMeta}>
          {kind === 'opportunity' ? label : 'Business'} · {relativeDate(updatedAt)}
        </Text>
      </View>
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
      style={({ pressed }) => [styles.manageButton, pressed && styles.rowPressed]}>
      <Ionicons color={v.textSoft} name={icon} size={17} />
      <Text numberOfLines={1} style={styles.manageLabel}>
        {label}
      </Text>
      <Ionicons color={v.muted} name="arrow-forward" size={15} />
    </Pressable>
  );
}

export function CreateStudioSkeleton() {
  return (
    <View style={styles.skeletonSection}>
      <View style={[styles.skeletonLine, { width: 128 }]} />
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

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function optionLabel<T extends string>(
  options: readonly { label: string; value: T }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function statusLabel(status: BusinessStatus | OpportunityStatus) {
  if (status === 'published' || status === 'active') return 'Active';
  return status.replace(/^\w/, (letter) => letter.toUpperCase());
}

function creationStatusTone(status: BusinessStatus | OpportunityStatus) {
  if (status === 'published' || status === 'active') {
    return { dot: v.purple, text: v.purpleStrong };
  }
  if (status === 'paused') {
    return { dot: '#EAB308', text: '#F2C94C' };
  }
  if (status === 'closed') {
    return { dot: v.muted, text: v.textSoft };
  }
  return { dot: v.muted, text: v.muted };
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

const promptExamples: { icon: IconName; label: string; prompt: string }[] = [
  {
    icon: 'people-outline',
    label: 'Need a cofounder',
    prompt:
      'Looking for a cofounder-type builder to help prototype a creator app, move fast, and think like an owner.',
  },
  {
    icon: 'code-slash-outline',
    label: 'Looking for a dev',
    prompt:
      'Need a React Native developer to help ship a polished mobile feature for a founder tool, remote and paid.',
  },
  {
    icon: 'trending-up-outline',
    label: 'Growth operator',
    prompt:
      'Need someone to run TikTok growth and short-form experiments for a creator brand launch.',
  },
  {
    icon: 'cut-outline',
    label: 'Short-form editor',
    prompt:
      'Need a short-form editor for YouTube and TikTok clips, paid per video, remote, CapCut preferred.',
  },
];

const styles = StyleSheet.create({
  builder: {
    gap: 18,
  },
  heroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  sectionLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 31,
  },
  heroSubtitle: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    lineHeight: 19,
    maxWidth: 330,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  composer: {
    backgroundColor: v.surface,
    borderColor: v.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 14,
  },
  composerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  composerLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tinyDot: {
    backgroundColor: v.purple,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  composerLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  countText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  promptInput: {
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 92,
    padding: 0,
  },
  composerFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  composerTools: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  toolButton: {
    alignItems: 'center',
    borderColor: v.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  previewButton: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 15,
  },
  previewButtonDisabled: {
    opacity: 0.42,
  },
  previewButtonText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  quickStart: {
    gap: 9,
  },
  exampleRail: {
    gap: 8,
    paddingRight: 16,
  },
  exampleChip: {
    alignItems: 'center',
    backgroundColor: v.surfaceSoft,
    borderColor: v.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    maxWidth: 198,
    minHeight: 32,
    paddingHorizontal: 11,
  },
  exampleText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  previewSection: {
    gap: 10,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewModes: {
    backgroundColor: v.surfaceSoft,
    borderColor: v.border,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  previewMode: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 58,
    paddingHorizontal: 10,
  },
  previewModeActive: {
    backgroundColor: v.purpleSoft,
  },
  previewModeText: {
    color: v.muted,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  previewModeTextActive: {
    color: v.purpleStrong,
  },
  socialPreview: {
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
  },
  quickSection: {
    gap: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionGridStacked: {
    flexDirection: 'column',
  },
  actionTileWrap: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  actionTile: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 78,
    padding: 11,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  actionTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionSupporting: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  actionBadge: {
    alignItems: 'center',
    backgroundColor: v.surfaceStrong,
    borderRadius: 12,
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionBadgeText: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingLeft: 12,
  },
  viewAllText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  draftRail: {
    gap: 10,
    paddingRight: 16,
  },
  draftCard: {
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 122,
    padding: 13,
    width: 226,
  },
  draftTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  draftIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 13,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  draftStatus: {
    backgroundColor: v.surfaceStrong,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  draftStatusText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  draftTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 12,
  },
  draftMeta: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    marginTop: 5,
  },
  continueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 'auto',
    minHeight: 30,
  },
  continueLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  creationRail: {
    gap: 10,
    paddingRight: 16,
  },
  creationTile: {
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 112,
    padding: 13,
    width: 198,
  },
  creationTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creationKind: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minWidth: 0,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  creationKindText: {
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  creationBody: {
    gap: 8,
    marginTop: 14,
  },
  creationImage: {
    borderRadius: 15,
    height: 30,
    width: 30,
  },
  creationTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  creationMeta: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  emptyCreationsCard: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  emptyCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  emptyTitle: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCreations: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  manageRow: {
    flexDirection: 'row',
    gap: 9,
  },
  manageButton: {
    alignItems: 'center',
    backgroundColor: v.surfaceSoft,
    borderColor: v.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  manageLabel: {
    color: v.text,
    flex: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  rowPressed: {
    opacity: 0.72,
  },
  skeletonSection: {
    gap: 12,
  },
  skeletonRow: {
    alignItems: 'center',
    backgroundColor: v.surface,
    borderColor: v.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    padding: 12,
  },
  skeletonIcon: {
    backgroundColor: v.surfaceStrong,
    borderRadius: 13,
    height: 38,
    width: 38,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    backgroundColor: v.surfaceStrong,
    borderRadius: 5,
    height: 10,
  },
});
