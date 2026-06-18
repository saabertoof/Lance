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

export type DiscoverDeckAction = 'pass' | 'save' | 'openDetail';

type DiscoverDeckProps = PropsWithChildren<{
  canUndo?: boolean;
  cardKey: string;
  detailLabel: string;
  nextCard?: ReactNode;
  onAction: (action: DiscoverDeckAction) => Promise<boolean | void> | boolean | void;
  onDismiss: () => void;
  onUndo?: () => void;
}>;

const HORIZONTAL_THRESHOLD = 88;
const VERTICAL_THRESHOLD = 86;

export function DiscoverDeck({
  canUndo,
  cardKey,
  children,
  detailLabel,
  nextCard,
  onAction,
  onDismiss,
  onUndo,
}: DiscoverDeckProps) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const threshold = useRef<DiscoverDeckAction | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    threshold.current = null;
    setIsActing(false);
  }, [cardKey, position]);

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-9deg', '0deg', '9deg'],
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
      setIsActing(true);

      if (action === 'openDetail') {
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
    [isActing, onAction, onDismiss, position, reduceMotion, reset, width],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !isActing &&
          (Math.abs(gesture.dx) > 10 ||
            (gesture.dy < -10 && Math.abs(gesture.dy) > Math.abs(gesture.dx))),
        onPanResponderMove: (_event, gesture) => {
          position.setValue({ x: gesture.dx, y: Math.min(gesture.dy, 12) });
          const nextThreshold =
            gesture.dx > HORIZONTAL_THRESHOLD
              ? 'save'
              : gesture.dx < -HORIZONTAL_THRESHOLD
                ? 'pass'
                : gesture.dy < -VERTICAL_THRESHOLD &&
                    Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.3
                  ? 'openDetail'
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
            void act('openDetail');
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
    [act, isActing, position, reset],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {nextCard ? <View style={styles.nextCard}>{nextCard}</View> : null}
        <Animated.View
          {...responder.panHandlers}
          style={[
            styles.card,
            { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
          ]}>
          <Animated.View style={[styles.passOverlay, { opacity: passOpacity }]}>
            <Text style={styles.passOverlayText}>PASS</Text>
          </Animated.View>
          <Animated.View style={[styles.saveOverlay, { opacity: saveOpacity }]}>
            <Text style={styles.saveOverlayText}>SAVE</Text>
          </Animated.View>
          <Pressable
            accessibilityHint={`Swipe up to ${detailLabel}`}
            accessibilityRole="button"
            onPress={() => void act('openDetail')}
            style={styles.openArea}>
            {children}
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.affordance}>
        <Ionicons color={theme.colors.muted} name="chevron-up" size={15} />
        <Text style={styles.affordanceText}>Swipe up to {detailLabel}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Undo last pass"
          disabled={!canUndo || isActing}
          onPress={onUndo}
          style={[styles.smallAction, (!canUndo || isActing) && styles.disabled]}>
          <Ionicons color={theme.colors.muted} name="arrow-undo" size={21} />
        </Pressable>
        <Pressable
          accessibilityLabel="Pass"
          disabled={isActing}
          onPress={() => void act('pass')}
          style={({ pressed }) => [styles.action, styles.pass, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.danger} name="close" size={30} />
        </Pressable>
        <Pressable
          accessibilityLabel="Save"
          disabled={isActing}
          onPress={() => void act('save')}
          style={({ pressed }) => [styles.action, styles.save, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.accentStrong} name="bookmark" size={25} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, gap: theme.spacing.sm },
  stack: { flex: 1, minHeight: 430, paddingBottom: 8, position: 'relative' },
  nextCard: {
    bottom: 0,
    left: 8,
    opacity: 0.5,
    position: 'absolute',
    right: 8,
    top: 14,
    transform: [{ scale: 0.97 }],
  },
  card: { flex: 1 },
  openArea: { flex: 1 },
  passOverlay: {
    backgroundColor: '#FFF3F3',
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    left: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    top: theme.spacing.lg,
    transform: [{ rotate: '-8deg' }],
    zIndex: 4,
  },
  saveOverlay: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.lg,
    transform: [{ rotate: '8deg' }],
    zIndex: 4,
  },
  passOverlayText: { color: theme.colors.danger, fontSize: theme.typography.subheading, fontWeight: '900' },
  saveOverlayText: { color: theme.colors.accentStrong, fontSize: theme.typography.subheading, fontWeight: '900' },
  affordance: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  affordanceText: { color: theme.colors.muted, fontSize: theme.typography.tiny },
  actions: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.lg, justifyContent: 'center' },
  action: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 74,
  },
  smallAction: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pass: { borderColor: '#F1CACA' },
  save: { borderColor: '#D8CEFF' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.3 },
});
