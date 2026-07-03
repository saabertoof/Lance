import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';

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
      <View pointerEvents="none" style={styles.ambientOne} />
      <View pointerEvents="none" style={styles.ambientTwo} />

      <View style={styles.posterRow}>
        <View style={styles.posterIdentity}>
          <View style={styles.poster}>
            {posterImageUrl ? (
              <Image contentFit="cover" source={posterImageUrl} style={styles.image} />
            ) : (
              <Text style={styles.mark}>{mark}</Text>
            )}
          </View>
          <View style={styles.posterCopy}>
            <Text numberOfLines={1} style={styles.posterLabel}>
              {posterLabel}
            </Text>
            <Text numberOfLines={1} style={styles.url}>
              {urlLabel}
            </Text>
          </View>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Preview</Text>
        </View>
      </View>

      <View style={styles.body}>
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
      </View>

      <View style={styles.footer}>
        <View style={styles.footerHint}>
          <Ionicons color={v.textSoft} name="link-outline" size={14} />
          <Text numberOfLines={1} style={styles.footerText}>
            Shareable opportunity page
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Apply</Text>
          <Ionicons color={v.white} name="arrow-forward" size={13} />
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
      <Ionicons color={v.textSoft} name={icon} size={14} />
      <Text numberOfLines={1} style={styles.metaText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: v.surface,
    borderColor: 'rgba(139,92,246,0.18)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 13,
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  ambientOne: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 90,
    height: 96,
    position: 'absolute',
    right: -40,
    top: -54,
    width: 96,
  },
  ambientTwo: {
    backgroundColor: 'rgba(255,255,255,0.026)',
    borderRadius: 96,
    bottom: -62,
    height: 112,
    left: -56,
    position: 'absolute',
    width: 112,
  },
  posterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  posterIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  poster: {
    alignItems: 'center',
    backgroundColor: v.surfaceStrong,
    borderColor: v.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  image: { height: '100%', width: '100%' },
  mark: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  posterCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  posterLabel: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  url: {
    color: v.muted,
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 26,
    paddingHorizontal: 8,
  },
  liveDot: {
    backgroundColor: v.purple,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  body: {
    gap: 10,
  },
  title: {
    color: v.text,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 27,
  },
  summary: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: v.surfaceSoft,
    borderColor: v.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  metaText: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skill: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '100%',
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  skillText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: v.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  footerHint: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    minWidth: 0,
  },
  footerText: {
    color: v.textSoft,
    flex: 1,
    fontFamily: operatorFonts.sans,
    fontSize: 12,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: v.purple,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 16,
  },
  ctaText: {
    color: v.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
});
