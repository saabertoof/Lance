import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export type OpportunityLinkPreviewCardProps = {
  compensationLabel: string;
  locationLabel: string;
  posterImageUrl?: string | null;
  posterLabel: string;
  skills: string[];
  summary: string;
  title: string;
  urlLabel: string;
};

export function OpportunityLinkPreviewCard({
  compensationLabel,
  locationLabel,
  posterImageUrl,
  posterLabel,
  skills,
  summary,
  title,
  urlLabel,
}: OpportunityLinkPreviewCardProps) {
  const mark = posterLabel.trim().charAt(0).toUpperCase() || 'L';
  const skillLabels = skills.slice(0, 3);

  return (
    <View style={styles.shell}>
      <View style={styles.art}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
        <View style={styles.poster}>
          {posterImageUrl ? (
            <Image contentFit="cover" source={posterImageUrl} style={styles.image} />
          ) : (
            <Text style={styles.mark}>{mark}</Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.topline}>
          <Text numberOfLines={1} style={styles.posterLabel}>
            {posterLabel}
          </Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Link preview</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {title || 'Creator opportunity link'}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {summary || 'Describe what you need and Lance turns it into a clean shareable page.'}
        </Text>

        <View style={styles.metaRow}>
          <MetaPill icon="cash-outline" label={compensationLabel || 'Compensation'} />
          <MetaPill icon="location-outline" label={locationLabel || 'Remote'} />
        </View>

        {skillLabels.length > 0 ? (
          <View style={styles.skills}>
            {skillLabels.map((skill) => (
              <View key={skill.toLowerCase()} style={styles.skill}>
                <Text numberOfLines={1} style={styles.skillText}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.ctaRow}>
          <Text numberOfLines={1} style={styles.url}>
            {urlLabel}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Apply</Text>
            <Ionicons color={theme.colors.white} name="arrow-forward" size={14} />
          </View>
        </View>
      </View>
    </View>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaPill}>
      <Ionicons color="rgba(255,255,255,0.78)" name={icon} size={13} />
      <Text numberOfLines={1} style={styles.metaText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#181622',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  art: {
    alignItems: 'center',
    backgroundColor: '#6E54FF',
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowOne: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 80,
    height: 150,
    position: 'absolute',
    right: -36,
    top: -52,
    transform: [{ rotate: '18deg' }],
    width: 86,
  },
  glowTwo: {
    backgroundColor: 'rgba(255,133,91,0.28)',
    borderRadius: 70,
    bottom: -44,
    height: 126,
    left: -28,
    position: 'absolute',
    transform: [{ rotate: '-20deg' }],
    width: 82,
  },
  poster: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.78)',
    borderRadius: 22,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  image: { height: '100%', width: '100%' },
  mark: {
    color: theme.colors.accentStrong,
    fontSize: 26,
    fontWeight: '900',
  },
  body: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  topline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  posterLabel: {
    color: 'rgba(255,255,255,0.66)',
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: {
    backgroundColor: theme.colors.success,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.white,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
    lineHeight: 21,
  },
  summary: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: theme.typography.caption,
    fontWeight: '700',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.radii.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 8,
  },
  metaText: {
    color: 'rgba(255,255,255,0.78)',
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  skill: {
    backgroundColor: 'rgba(124,92,255,0.22)',
    borderRadius: theme.radii.pill,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  skillText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  ctaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  url: {
    color: 'rgba(255,255,255,0.48)',
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  cta: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 12,
  },
  ctaText: {
    color: theme.colors.white,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
});
