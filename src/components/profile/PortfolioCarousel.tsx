import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import { openExternalUrl } from '@/lib/externalLinks';
import type { PortfolioItem } from '@/types/profilePolish';

import { profileFonts, profileVisual } from './profileVisual';

export function PortfolioCarousel({
  accent,
  items,
  radius,
  onError,
}: {
  accent: string;
  items: PortfolioItem[];
  radius: number;
  onError: (message: string) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 430);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setAutoAdvance(!enabled && items.length > 1))
      .catch(() => undefined);
  }, [items.length]);

  useEffect(() => {
    if (!autoAdvance || interacted || items.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % items.length;
        scrollRef.current?.scrollTo({ animated: true, x: next * (cardWidth + 12) });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [autoAdvance, cardWidth, interacted, items.length]);

  async function openItem(item: PortfolioItem) {
    setInteracted(true);
    setAutoAdvance(false);
    const target = item.externalUrl;
    if (!target) return;
    await openExternalUrl(target, {
      label: 'Portfolio link',
      onError,
    });
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.content}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={(event) =>
          setIndex(
            Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12)),
          )
        }
        onScrollBeginDrag={() => {
          setInteracted(true);
          setAutoAdvance(false);
        }}
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}>
        {items.map((item) => (
          <Pressable
            accessibilityLabel={item.title}
            accessibilityRole={item.externalUrl ? 'link' : 'image'}
            key={item.id}
            onPress={() => void openItem(item)}
            style={({ pressed }) => [
              styles.card,
              { borderRadius: radius, width: cardWidth },
              pressed && styles.pressed,
            ]}>
            <View style={styles.media}>
              {item.mediaUrl || item.thumbnailUrl ? (
                <Image
                  accessibilityLabel={item.accessibilityDescription || item.title}
                  contentFit="cover"
                  recyclingKey={item.id}
                  source={item.thumbnailUrl ?? item.mediaUrl}
                  style={styles.image}
                  transition={180}
                />
              ) : (
                <View style={styles.fallback}>
                  <Ionicons color={accent} name="briefcase-outline" size={38} />
                </View>
              )}
              {item.itemType === 'external_video' ? (
                <View style={styles.play}>
                  <Ionicons color={profileVisual.white} name="play" size={22} />
                </View>
              ) : null}
            </View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
              {item.caption ? (
                <Text numberOfLines={2} style={styles.caption}>{item.caption}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.controls}>
        <View style={styles.dots}>
          {items.map((item, itemIndex) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                itemIndex === index && { backgroundColor: accent, width: 18 },
              ]}
            />
          ))}
        </View>
        {items.length > 1 ? (
          <Pressable
            accessibilityLabel={autoAdvance ? 'Pause portfolio' : 'Play portfolio'}
            onPress={() => {
              setInteracted(false);
              setAutoAdvance((current) => !current);
            }}
            style={styles.playControl}>
            <Ionicons
              color={profileVisual.muted}
              name={autoAdvance ? 'pause' : 'play'}
              size={16}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm },
  content: { gap: theme.spacing.md, paddingRight: theme.layout.screenPadding },
  card: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: profileVisual.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  media: { aspectRatio: 16 / 9, backgroundColor: 'rgba(255,255,255,0.04)' },
  image: { height: '100%', width: '100%' },
  fallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  play: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,18,0.72)',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -27,
    marginTop: -27,
    position: 'absolute',
    top: '50%',
    width: 54,
  },
  copy: { gap: 4, padding: 12 },
  title: {
    color: profileVisual.text,
    fontFamily: profileFonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    color: profileVisual.muted,
    fontFamily: profileFonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  controls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { backgroundColor: profileVisual.border, borderRadius: 3, height: 5, width: 5 },
  playControl: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: profileVisual.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  pressed: { opacity: 0.86 },
});
