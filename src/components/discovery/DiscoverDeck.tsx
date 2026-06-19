import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

export type DiscoverDeckAction =
  | 'pass'
  | 'save'
  | 'share'
  | 'openDetail'
  | 'primaryAction';

type DiscoverDeckProps = PropsWithChildren<{
  canUndo?: boolean;
  cardKey: string;
  detailLabel: string;
  isSaved: boolean;
  nextCard?: ReactNode;
  onAction: (
    action: DiscoverDeckAction,
  ) => Promise<boolean | void> | boolean | void;
  onDismiss: () => void;
  onJiggleComplete?: () => void;
  onUndo?: () => void;
  primaryActionLabel: string;
  shouldJiggle?: boolean;
}>;

const HORIZONTAL_THRESHOLD = 88;
const VERTICAL_THRESHOLD = 86;

export function DiscoverDeck({
  canUndo,
  cardKey,
  children,
  detailLabel,
  isSaved,
  nextCard,
  onAction,
  onDismiss,
  onJiggleComplete,
  onUndo,
  primaryActionLabel,
  shouldJiggle,
}: DiscoverDeckProps) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const jiggleX = useRef(new Animated.Value(0)).current;
  const jiggleDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jiggleAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const jiggleFinished = useRef(false);
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

  const finishJiggle = useCallback(() => {
    if (jiggleFinished.current) return;
    jiggleFinished.current = true;
    onJiggleComplete?.();
  }, [onJiggleComplete]);

  const cancelJiggle = useCallback(() => {
    if (jiggleDelay.current) {
      clearTimeout(jiggleDelay.current);
      jiggleDelay.current = null;
    }
    jiggleAnimation.current?.stop();
    jiggleAnimation.current = null;
    jiggleX.setValue(0);
    if (shouldJiggle) finishJiggle();
  }, [finishJiggle, jiggleX, shouldJiggle]);

  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    threshold.current = null;
    setIsActing(false);
  }, [cardKey, position]);

  useEffect(() => {
    if (!shouldJiggle || reduceMotion !== false || jiggleFinished.current) return;

    jiggleDelay.current = setTimeout(() => {
      const sequence = Animated.sequence([
        Animated.timing(jiggleX, {
          duration: 190,
          toValue: 11,
          useNativeDriver: true,
        }),
        Animated.timing(jiggleX, {
          duration: 260,
          toValue: -9,
          useNativeDriver: true,
        }),
        Animated.spring(jiggleX, {
          friction: 7,
          tension: 70,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]);
      jiggleAnimation.current = sequence;
      sequence.start(({ finished }) => {
        jiggleAnimation.current = null;
        jiggleX.setValue(0);
        if (finished) finishJiggle();
      });
    }, 550);

    return () => {
      if (jiggleDelay.current) clearTimeout(jiggleDelay.current);
      jiggleAnimation.current?.stop();
      jiggleDelay.current = null;
      jiggleAnimation.current = null;
      jiggleX.setValue(0);
    };
  }, [finishJiggle, jiggleX, reduceMotion, shouldJiggle]);

  useEffect(() => {
    if (shouldJiggle && reduceMotion === true) finishJiggle();
  }, [finishJiggle, reduceMotion, shouldJiggle]);

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });
  const jiggleRotate = jiggleX.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: ['-1.4deg', '0deg', '1.4deg'],
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
        {nextCard ? <View style={styles.nextCard}>{nextCard}</View> : null}
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
              <Text style={styles.passOverlayText}>PASS</Text>
            </Animated.View>
            <Animated.View style={[styles.saveOverlay, { opacity: saveOpacity }]}>
              <Text style={styles.saveOverlayText}>SAVE</Text>
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

      {canUndo ? (
        <View accessibilityLiveRegion="polite" style={styles.undoToast}>
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

      <View style={styles.actions}>
        <ActionButton
          accessibilityHint="Passes this card"
          color={theme.colors.danger}
          icon="close"
          label="Pass"
          disabled={isActing}
          onPress={() => void act('pass')}
          tone="pass"
        />
        <ActionButton
          accessibilityHint={`Opens the ${primaryActionLabel} review`}
          color={theme.colors.white}
          icon="paper-plane"
          label={primaryActionLabel}
          disabled={isActing}
          onPress={() => void act('primaryAction')}
          tone="primary"
        />
        <ActionButton
          accessibilityHint="Saves this privately"
          color={isSaved ? theme.colors.white : theme.colors.accentStrong}
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          label={isSaved ? 'Saved privately' : 'Save privately'}
          disabled={isActing}
          onPress={() => void act('save')}
          tone={isSaved ? 'saved' : 'save'}
        />
        <ActionButton
          accessibilityHint="Opens the native share sheet"
          color={theme.colors.text}
          icon="share-outline"
          label="Share"
          disabled={isActing}
          onPress={() => void act('share')}
          tone="share"
        />
      </View>
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
    gap: theme.spacing.md,
    position: 'relative',
  },
  stack: {
    flex: 1,
    minHeight: 390,
    paddingBottom: 6,
    position: 'relative',
  },
  nextCard: {
    bottom: 0,
    left: 7,
    opacity: 0.48,
    position: 'absolute',
    right: 7,
    top: 12,
    transform: [{ scale: 0.975 }],
  },
  jiggleLayer: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  openArea: {
    flex: 1,
  },
  passOverlay: {
    backgroundColor: 'rgba(255,243,243,0.94)',
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    left: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    top: theme.spacing.lg,
    transform: [{ rotate: '-8deg' }],
    zIndex: 5,
  },
  saveOverlay: {
    backgroundColor: 'rgba(240,236,255,0.96)',
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.lg,
    transform: [{ rotate: '8deg' }],
    zIndex: 5,
  },
  passOverlayText: {
    color: theme.colors.danger,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  saveOverlayText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.subheading,
    fontWeight: '900',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    minHeight: 60,
  },
  action: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
    ...theme.shadows.card,
  },
  passAction: {
    backgroundColor: '#FFF6F5',
    borderColor: '#F0CECB',
  },
  primaryAction: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  saveAction: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
  },
  savedAction: {
    backgroundColor: theme.colors.accentStrong,
    borderColor: theme.colors.accentStrong,
  },
  shareAction: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
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
    backgroundColor: 'rgba(8,10,18,0.94)',
    borderRadius: theme.radii.pill,
    bottom: 72,
    flexDirection: 'row',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    zIndex: 10,
  },
  undoMessage: {
    color: theme.colors.white,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  undoLabel: {
    color: '#BFB2FF',
    fontSize: theme.typography.small,
    fontWeight: '900',
  },
  undoPressed: {
    opacity: 0.65,
  },
});
