import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_HEIGHT,
  useAdaptiveTabBar,
} from '@/context/AdaptiveTabBarContext';

const tabDefinitions: Record<
  string,
  {
    activeIcon?: keyof typeof Ionicons.glyphMap;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  discover: { icon: 'compass-outline', label: 'Discover' },
  search: { icon: 'search-outline', label: 'Search' },
  create: { icon: 'add', label: 'Create' },
  messages: {
    activeIcon: 'paper-plane',
    icon: 'paper-plane-outline',
    label: 'Messages',
  },
  profile: { icon: 'person-outline', label: 'Profile' },
};

export function AdaptiveTabBar({
  avatarUrl,
  navigation,
  searchAlertCount,
  state,
  unreadCount,
}: BottomTabBarProps & {
  avatarUrl: string | null;
  searchAlertCount: number;
  unreadCount: number;
}) {
  const insets = useSafeAreaInsets();
  const { compact, expand, keyboardVisible, reduceMotion } =
    useAdaptiveTabBar();
  const progress = useSharedValue(compact ? 1 : 0);
  const keyboardProgress = useSharedValue(keyboardVisible ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? compact
        ? 1
        : 0
      : withTiming(compact ? 1 : 0, { duration: 180 });
  }, [compact, progress, reduceMotion]);

  useEffect(() => {
    keyboardProgress.value = reduceMotion
      ? keyboardVisible
        ? 1
        : 0
      : withTiming(keyboardVisible ? 1 : 0, { duration: 160 });
  }, [keyboardProgress, keyboardVisible, reduceMotion]);

  useEffect(() => {
    expand();
  }, [expand, state.index]);

  const barStyle = useAnimatedStyle(() => ({
    height: interpolate(
      progress.value,
      [0, 1],
      [FLOATING_TAB_BAR_HEIGHT, 56],
    ),
    left: interpolate(progress.value, [0, 1], [18, 42]),
    opacity: interpolate(keyboardProgress.value, [0, 1], [1, 0]),
    right: interpolate(progress.value, [0, 1], [18, 42]),
    transform: [
      {
        translateY:
          interpolate(progress.value, [0, 1], [0, 6]) +
          interpolate(keyboardProgress.value, [0, 1], [0, 18]),
      },
    ],
  }));

  return (
    <View
      pointerEvents={keyboardVisible ? 'none' : 'box-none'}
      style={[
        styles.host,
        {
          height:
            FLOATING_TAB_BAR_HEIGHT +
            Math.max(insets.bottom, FLOATING_TAB_BAR_BOTTOM_GAP) +
            12,
        },
      ]}>
      <Animated.View
        style={[
          styles.bar,
          {
            bottom: Math.max(
              insets.bottom,
              FLOATING_TAB_BAR_BOTTOM_GAP,
            ),
          },
          barStyle,
        ]}>
        {state.routes.map((route, index) => {
          const definition = tabDefinitions[route.name];
          if (!definition) return null;
          const selected = state.index === index;
          const badge =
            route.name === 'messages' && unreadCount > 0
              ? Math.min(unreadCount, 99)
              : route.name === 'search' && searchAlertCount > 0
                ? Math.min(searchAlertCount, 99)
              : null;

          return (
            <Pressable
              accessibilityLabel={definition.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityValue={
                route.name === 'messages' || route.name === 'search'
                  ? {
                      text: badge
                        ? route.name === 'messages'
                          ? `${badge} unread message${badge === 1 ? '' : 's'}`
                          : `${badge} unread opportunity alert${badge === 1 ? '' : 's'}`
                        : route.name === 'messages'
                          ? 'No unread messages'
                          : 'No unread opportunity alerts',
                    }
                  : undefined
              }
              key={route.key}
              onLongPress={() =>
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                })
              }
              onPress={() => {
                expand();
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: 'tabPress',
                });
                if (!selected && !event.defaultPrevented) {
                  void Haptics.selectionAsync();
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.activeSurface,
                  selected && styles.activeSurfaceSelected,
                ]}>
                <View>
                  {route.name === 'profile' && avatarUrl ? (
                    <View
                      style={[
                        styles.avatar,
                        selected && styles.avatarSelected,
                      ]}>
                      <Image
                        accessibilityLabel="Your profile photo"
                        contentFit="cover"
                        recyclingKey={avatarUrl}
                        source={avatarUrl}
                        style={styles.image}
                      />
                    </View>
                  ) : (
                    <Ionicons
                      color={
                        selected ? theme.colors.white : 'rgba(255,255,255,0.72)'
                      }
                      name={
                        selected
                          ? definition.activeIcon ?? definition.icon
                          : definition.icon
                      }
                      size={route.name === 'create' ? 26 : 24}
                    />
                  )}
                </View>
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
                {selected ? <View style={styles.activeDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,10,0.92)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    position: 'absolute',
    shadowColor: '#080A12',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    height: 50,
    justifyContent: 'center',
    minWidth: 44,
  },
  activeSurface: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  activeSurfaceSelected: {
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
  activeDot: {
    backgroundColor: theme.colors.accentStrong,
    borderRadius: 3,
    bottom: 2,
    height: 5,
    position: 'absolute',
    width: 5,
  },
  avatar: {
    borderColor: 'rgba(255,255,255,0.48)',
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    overflow: 'hidden',
    width: 32,
  },
  avatarSelected: {
    borderColor: theme.colors.white,
    borderWidth: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#E34949',
    borderColor: '#080A12',
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -5,
    top: -4,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
