import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { operatorFonts, operatorVisual as v } from '@/constants/operatorTheme';
import { theme } from '@/constants/theme';

export type DiscoverDeckAction =
  | 'pass'
  | 'save'
  | 'share'
  | 'openDetail'
  | 'primaryAction';

type DiscoverDeckProps = PropsWithChildren<{
  active: boolean;
  canUndo?: boolean;
  cardKey: string;
  detailLabel: string;
  isSaved: boolean;
  nextCard?: ReactNode;
  onAction: (
    action: DiscoverDeckAction,
  ) => Promise<boolean | void> | boolean | void;
  onDismiss: () => void;
  onUndo?: () => void;
  primaryActionLabel: string;
  jiggleTrigger: number;
}>;

const HORIZONTAL_THRESHOLD = 88;
const VERTICAL_THRESHOLD = 86;

export function DiscoverDeck({
  active,
  canUndo,
  cardKey,
  children,
  detailLabel,
  isSaved,
  nextCard,
  onAction,
  onDismiss,
  onUndo,
  primaryActionLabel,
  jiggleTrigger,
}: DiscoverDeckProps) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const jiggleX = useRef(new Animated.Value(0)).current;
  const jiggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jiggleAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const immediateJigglePlayedFor = useRef<number | null>(null);
  const threshold = useRef<DiscoverDeckAction | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(false);
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const clearJiggleTimer = useCallback(() => {
    if (jiggleTimer.current) {
      clearTimeout(jiggleTimer.current);
      jiggleTimer.current = null;
    }
  }, []);

  const cancelJiggle = useCallback(() => {
    clearJiggleTimer();
    jiggleAnimation.current?.stop();
    jiggleAnimation.current = null;
    jiggleX.setValue(0);
  }, [clearJiggleTimer, jiggleX]);

  const runJiggle = useCallback(
    (onComplete?: () => void) => {
      clearJiggleTimer();
      jiggleAnimation.current?.stop();
      jiggleX.setValue(0);

      const sequence = Animated.sequence([
        Animated.timing(jiggleX, {
          duration: 105,
          toValue: 10,
          useNativeDriver: true,
        }),
        Animated.timing(jiggleX, {
          duration: 115,
          toValue: -8,
          useNativeDriver: true,
        }),
        Animated.timing(jiggleX, {
          duration: 95,
          toValue: 5,
          useNativeDriver: true,
        }),
        Animated.spring(jiggleX, {
          friction: 7,
          tension: 92,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]);

      jiggleAnimation.current = sequence;
      sequence.start(({ finished }) => {
        jiggleAnimation.current = null;
        jiggleX.setValue(0);
        if (finished) onComplete?.();
      });
    },
    [clearJiggleTimer, jiggleX],
  );

  useLayoutEffect(() => {
    position.stopAnimation();
    position.setValue({ x: 0, y: 0 });
    threshold.current = null;
    setIsActing(false);
  }, [cardKey, position]);

  useEffect(() => {
    if (!active || reduceMotion !== false || isActing) {
      cancelJiggle();
      return undefined;
    }

    let alive = true;
    const scheduleNextJiggle = () => {
      clearJiggleTimer();
      jiggleTimer.current = setTimeout(() => {
        if (!alive) return;
        runJiggle(() => {
          if (alive) scheduleNextJiggle();
        });
      }, 5000);
    };
    const shouldRunImmediate =
      immediateJigglePlayedFor.current !== jiggleTrigger;

    if (shouldRunImmediate) {
      immediateJigglePlayedFor.current = jiggleTrigger;
      runJiggle(() => {
        if (alive) scheduleNextJiggle();
      });
    } else {
      scheduleNextJiggle();
    }

    return () => {
      alive = false;
      clearJiggleTimer();
      jiggleAnimation.current?.stop();
      jiggleAnimation.current = null;
      jiggleX.setValue(0);
    };
  }, [
    active,
    cancelJiggle,
    cardKey,
    clearJiggleTimer,
    isActing,
    jiggleTrigger,
    jiggleX,
    reduceMotion,
    runJiggle,
  ]);

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });
  const jiggleRotate = jiggleX.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ['-1.5deg', '0deg', '1.5deg'],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-120, -35, 0],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });
  const saveOpacity = position.x.interpolate({
    inputRange: [0, 35, 120],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });
  const primaryOpacity = position.y.interpolate({
    inputRange: [-130, -48, 0],
    outputRange: [1, 0.28, 0],
    extrapolate: 'clamp',
  });
  const nextCardOpacity = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.52, 1],
    extrapolate: 'clamp',
  });
  const nextCardScale = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.965, 1],
    extrapolate: 'clamp',
  });
  const nextCardTranslateY = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0, 10, 0],
    extrapolate: 'clamp',
  });
  const primaryIcon: keyof typeof Ionicons.glyphMap =
    primaryActionLabel.toLowerCase() === 'apply'
      ? 'briefcase-outline'
      : 'paper-plane-outline';

  const reset = useCallback(() => {
    threshold.current = null;
    Animated.spring(position, {
      friction: 7,
      tension: 65,
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start(() => setIsActing(false));
  }, [position]);

  const act = useCallback(
    async (action: DiscoverDeckAction) => {
      if (isActing) return;
      cancelJiggle();
      setIsActing(true);

      if (
        action === 'openDetail' ||
        action === 'primaryAction' ||
        action === 'share'
      ) {
        await onAction(action);
        reset();
        return;
      }

      const succeeded = await onAction(action);
      if (action === 'save' && succeeded === false) {
        reset();
        return;
      }

      const destination = action === 'pass' ? -width * 1.25 : width * 1.25;
      Animated.timing(position, {
        duration: reduceMotion ? 1 : 210,
        easing: Easing.out(Easing.cubic),
        toValue: { x: destination, y: 4 },
        useNativeDriver: true,
      }).start(onDismiss);
    },
    [
      cancelJiggle,
      isActing,
      onAction,
      onDismiss,
      position,
      reduceMotion,
      reset,
      width,
    ],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !isActing &&
          (Math.abs(gesture.dx) > 10 ||
            (gesture.dy < -10 && Math.abs(gesture.dy) > Math.abs(gesture.dx))),
        onPanResponderGrant: cancelJiggle,
        onPanResponderMove: (_event, gesture) => {
          position.setValue({ x: gesture.dx, y: Math.min(gesture.dy, 12) });
          const nextThreshold =
            gesture.dx > HORIZONTAL_THRESHOLD
              ? 'save'
              : gesture.dx < -HORIZONTAL_THRESHOLD
                ? 'pass'
                : gesture.dy < -VERTICAL_THRESHOLD &&
                    Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.3
                  ? 'primaryAction'
                  : null;
          if (nextThreshold && threshold.current !== nextThreshold) {
            void Haptics.selectionAsync();
          }
          threshold.current = nextThreshold;
        },
        onPanResponderRelease: (_event, gesture) => {
          if (
            gesture.dy < -VERTICAL_THRESHOLD &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.3
          ) {
            void act('primaryAction');
          } else if (gesture.dx > HORIZONTAL_THRESHOLD) {
            void act('save');
          } else if (gesture.dx < -HORIZONTAL_THRESHOLD) {
            void act('pass');
          } else {
            reset();
          }
        },
        onPanResponderTerminate: reset,
      }),
    [act, cancelJiggle, isActing, position, reset],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {nextCard ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.nextCard,
              {
                opacity: nextCardOpacity,
                transform: [
                  { translateY: nextCardTranslateY },
                  { scale: nextCardScale },
                ],
              },
            ]}>
            {nextCard}
          </Animated.View>
        ) : null}
        <Animated.View
          style={[
            styles.jiggleLayer,
            { transform: [{ translateX: jiggleX }, { rotate: jiggleRotate }] },
          ]}>
          <Animated.View
            {...responder.panHandlers}
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
              },
            ]}>
            <Animated.View style={[styles.passOverlay, { opacity: passOpacity }]}>
              <Ionicons color="#FF5D79" name="close" size={22} />
              <Text style={styles.passOverlayText}>PASS</Text>
            </Animated.View>
            <Animated.View style={[styles.saveOverlay, { opacity: saveOpacity }]}>
              <Ionicons color={v.purpleStrong} name="bookmark" size={21} />
              <Text style={styles.saveOverlayText}>SAVE</Text>
            </Animated.View>
            <Animated.View style={[styles.primaryOverlay, { opacity: primaryOpacity }]}>
              <Ionicons color={theme.colors.white} name="arrow-up" size={16} />
              <Text style={styles.primaryOverlayText}>{primaryActionLabel}</Text>
            </Animated.View>
            <Pressable
              accessibilityHint={`Opens ${detailLabel}`}
              accessibilityRole="button"
              onPress={() => void act('openDetail')}
              onPressIn={cancelJiggle}
              style={styles.openArea}>
              {children}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          accessibilityHint="Passes this card"
          color="#FF5D79"
          icon="close"
          label="Pass"
          disabled={isActing}
          onPress={() => void act('pass')}
          tone="pass"
        />
        <ActionButton
          accessibilityHint={`Opens the ${primaryActionLabel} review`}
          color={v.white}
          icon={primaryIcon}
          label={primaryActionLabel}
          disabled={isActing}
          onPress={() => void act('primaryAction')}
          tone="primary"
        />
        <ActionButton
          accessibilityHint="Saves this privately"
          color={isSaved ? v.white : v.purpleStrong}
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          label={isSaved ? 'Saved privately' : 'Save privately'}
          disabled={isActing}
          onPress={() => void act('save')}
          tone={isSaved ? 'saved' : 'save'}
        />
        <ActionButton
          accessibilityHint="Opens the native share sheet"
          color={v.textSoft}
          icon="share-outline"
          label="Share"
          disabled={isActing}
          onPress={() => void act('share')}
          tone="share"
        />
      </View>

      {canUndo ? (
        <View accessibilityLiveRegion="polite" style={styles.undoToast}>
          <Ionicons color={v.textSoft} name="return-up-back-outline" size={15} />
          <Text style={styles.undoMessage}>Passed</Text>
          <Pressable
            accessibilityLabel="Undo last pass"
            accessibilityRole="button"
            onPress={onUndo}
            style={({ pressed }) => pressed && styles.undoPressed}>
            <Text style={styles.undoLabel}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  accessibilityHint,
  color,
  disabled,
  icon,
  label,
  onPress,
  tone,
}: {
  accessibilityHint: string;
  color: string;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: 'pass' | 'primary' | 'save' | 'saved' | 'share';
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        styles[`${tone}Action`],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Ionicons color={color} name={icon} size={25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: 12,
    position: 'relative',
  },
  stack: {
    flex: 1,
    minHeight: 390,
    paddingBottom: 2,
    position: 'relative',
  },
  nextCard: {
    bottom: 2,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 2,
    zIndex: 0,
  },
  jiggleLayer: {
    flex: 1,
    zIndex: 2,
  },
  card: {
    flex: 1,
  },
  openArea: {
    flex: 1,
  },
  passOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,10,16,0.86)',
    borderColor: 'rgba(255,93,121,0.55)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    top: 18,
    transform: [{ rotate: '-8deg' }],
    zIndex: 5,
  },
  saveOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(18,13,32,0.88)',
    borderColor: v.borderPurple,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 18,
    top: 18,
    transform: [{ rotate: '8deg' }],
    zIndex: 5,
  },
  passOverlayText: {
    color: '#FF5D79',
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  saveOverlayText: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.monoSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryOverlay: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(8,10,18,0.88)',
    borderColor: v.borderPurple,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    top: 14,
    zIndex: 6,
  },
  primaryOverlayText: {
    color: theme.colors.white,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(12,13,20,0.86)',
    borderColor: v.border,
    borderRadius: 36,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 13,
    width: '100%',
  },
  action: {
    alignItems: 'center',
    borderColor: v.borderStrong,
    borderRadius: 27,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  passAction: {
    backgroundColor: 'rgba(255,93,121,0.08)',
    borderColor: 'rgba(255,93,121,0.24)',
  },
  primaryAction: {
    backgroundColor: v.purple,
    borderColor: 'rgba(167,139,250,0.72)',
    borderRadius: 27,
  },
  saveAction: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderColor: v.borderPurple,
  },
  savedAction: {
    backgroundColor: v.purple,
    borderColor: v.purple,
  },
  shareAction: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: v.border,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.55,
  },
  undoToast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(16,16,24,0.94)',
    borderColor: v.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 36,
    paddingHorizontal: 14,
    zIndex: 10,
  },
  undoMessage: {
    color: v.text,
    fontFamily: operatorFonts.sans,
    fontSize: 13,
  },
  undoLabel: {
    color: v.purpleStrong,
    fontFamily: operatorFonts.sansSemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  undoPressed: {
    opacity: 0.65,
  },
});
