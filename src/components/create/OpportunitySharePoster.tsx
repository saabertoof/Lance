import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';

export type OpportunitySharePosterProps = {
  compensationLabel: string;
  locationLabel: string;
  posterImageUrl?: string | null;
  posterLabel: string;
  skills: string[];
  summary: string;
  title: string;
  urlLabel: string;
};

export const OpportunitySharePoster = forwardRef<
  View,
  OpportunitySharePosterProps
>(function OpportunitySharePoster(
  {
    compensationLabel,
    locationLabel,
    posterImageUrl,
    posterLabel,
    skills,
    summary,
    title,
    urlLabel,
  },
  ref,
) {
  const mark = posterLabel.trim().charAt(0).toUpperCase() || 'L';

  return (
    <View ref={ref} collapsable={false} style={styles.poster}>
      <View style={styles.media}>
        {posterImageUrl ? (
          <Image
            blurRadius={18}
            cachePolicy="memory-disk"
            contentFit="cover"
            pointerEvents="none"
            priority="high"
            source={posterImageUrl}
            style={styles.mediaImage}
          />
        ) : (
          <Text style={styles.mediaMark}>{mark}</Text>
        )}
        <View pointerEvents="none" style={styles.mediaShade} />
        <View style={styles.brandRow}>
          <Text style={styles.brand}>LANCE</Text>
          <View style={styles.openPill}>
            <View style={styles.openDot} />
            <Text style={styles.openText}>Open</Text>
          </View>
        </View>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {posterImageUrl ? (
              <Image
                cachePolicy="memory-disk"
                contentFit="cover"
                priority="high"
                source={posterImageUrl}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarMark}>{mark}</Text>
            )}
          </View>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.posterLabel}>
              {posterLabel}
            </Text>
            <Text style={styles.identityMeta}>Creator opportunity</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={3} style={styles.title}>
          {title || 'Creator opportunity'}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {summary || 'A focused opportunity for someone ready to build.'}
        </Text>

        <View style={styles.meta}>
          <PosterMeta icon="cash-outline" label={compensationLabel || 'Flexible'} />
          <PosterMeta icon="location-outline" label={locationLabel || 'Remote'} />
        </View>

        {skills.length > 0 ? (
          <View style={styles.skills}>
            {skills.slice(0, 2).map((skill) => (
              <View key={skill.toLowerCase()} style={styles.skill}>
                <Text numberOfLines={1} style={styles.skillText}>
                  {skill}
                </Text>
              </View>
            ))}
            {skills.length > 2 ? (
              <View style={styles.skill}>
                <Text style={styles.skillText}>+{skills.length - 2}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.linkCopy}>
          <Text style={styles.linkLabel}>View and apply</Text>
          <Text numberOfLines={1} style={styles.link}>
            {urlLabel}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Ionicons color={v.white} name="arrow-forward" size={19} />
        </View>
      </View>
    </View>
  );
});

function PosterMeta({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons color={v.purpleStrong} name={icon} size={15} />
      <Text numberOfLines={1} style={styles.metaText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    aspectRatio: 4 / 5,
    backgroundColor: '#08080D',
    borderColor: 'rgba(167,139,250,0.34)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  media: {
    backgroundColor: '#14131D',
    height: '28%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 18,
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.46,
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,10,0.48)',
  },
  mediaMark: {
    color: 'rgba(167,139,250,0.2)',
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 132,
    position: 'absolute',
    right: 14,
    top: -8,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 16,
  },
  brand: {
    color: v.white,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  openPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(7,9,12,0.66)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 27,
    paddingHorizontal: 9,
  },
  openDot: {
    backgroundColor: v.green,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  openText: {
    color: v.white,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#171522',
    borderColor: 'rgba(255,255,255,0.66)',
    borderRadius: 28,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarMark: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 20,
  },
  identityCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  posterLabel: {
    color: v.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
  },
  identityMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: operatorFonts.sans,
    fontSize: 11,
  },
  content: {
    flex: 1,
    gap: 8,
    padding: 16,
  },
  title: {
    color: v.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  summary: {
    color: v.textSoft,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    minHeight: 30,
    paddingHorizontal: 9,
  },
  metaText: {
    color: v.textSoft,
    flexShrink: 1,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skill: {
    backgroundColor: v.purpleSoft,
    borderColor: v.borderPurple,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: '44%',
    minHeight: 27,
    paddingHorizontal: 8,
  },
  skillText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 10,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 13,
  },
  linkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  linkLabel: {
    color: v.muted,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  link: {
    color: v.white,
    fontFamily: operatorFonts.sansMedium,
    fontSize: 12,
    fontWeight: '500',
  },
  arrow: {
    alignItems: 'center',
    backgroundColor: v.purple,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
