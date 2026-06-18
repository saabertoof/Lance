import { Ionicons } from '@expo/vector-icons';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

type DiscoverDeckProps = PropsWithChildren<{
  cardKey: string;
  onAdvance: () => void;
  onOpen: () => void;
  onSave: () => Promise<boolean>;
}>;

const SWIPE_THRESHOLD = 90;
const SCREEN_WIDTH = Dimensions.get('window').width;

export function DiscoverDeck({
  cardKey,
  children,
  onAdvance,
  onOpen,
  onSave,
}: DiscoverDeckProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const [isActing, setIsActing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    setIsActing(false);
  }, [cardKey, position]);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-120, -35, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });
  const saveOpacity = position.x.interpolate({
    inputRange: [0, 35, 120],
    outputRange: [0, 0.35, 1],
    extrapolate: 'clamp',
  });

  const reset = useCallback(() => {
    Animated.spring(position, {
      friction: 7,
      tension: 60,
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start(() => setIsActing(false));
  }, [position]);

  const act = useCallback(
    async (direction: 'pass' | 'save') => {
      if (isActing) return;
      setIsActing(true);

      if (direction === 'save') {
        const saved = await onSave();
        if (!saved) {
          reset();
          return;
        }
      }

      const destination =
        direction === 'pass' ? -SCREEN_WIDTH * 1.2 : SCREEN_WIDTH * 1.2;
      Animated.timing(position, {
        duration: reduceMotion ? 1 : 220,
        toValue: { x: destination, y: 8 },
        useNativeDriver: true,
      }).start(() => {
        onAdvance();
      });
    },
    [isActing, onAdvance, onSave, position, reduceMotion, reset],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !isActing &&
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false },
        ),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) void act('save');
          else if (gesture.dx < -SWIPE_THRESHOLD) void act('pass');
          else reset();
        },
        onPanResponderTerminate: reset,
      }),
    [act, isActing, position, reset],
  );

  return (
    <View style={styles.wrapper}>
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
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.openArea}>
          {children}
        </Pressable>
      </Animated.View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Pass"
          accessibilityRole="button"
          disabled={isActing}
          onPress={() => void act('pass')}
          style={({ pressed }) => [styles.action, styles.pass, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.danger} name="close" size={28} />
          <Text style={styles.passLabel}>Pass</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Save"
          accessibilityRole="button"
          disabled={isActing}
          onPress={() => void act('save')}
          style={({ pressed }) => [styles.action, styles.save, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.accentStrong} name="bookmark" size={24} />
          <Text style={styles.saveLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: theme.spacing.xl,
  },
  card: {
    flex: 1,
    minHeight: 430,
  },
  openArea: {
    flex: 1,
  },
  passOverlay: {
    backgroundColor: '#FFF3F3',
    borderColor: theme.colors.danger,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    left: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    top: theme.spacing.xl,
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
    right: theme.spacing.xl,
    top: theme.spacing.xl,
    transform: [{ rotate: '8deg' }],
    zIndex: 4,
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
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  action: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 130,
    paddingHorizontal: theme.spacing.xl,
  },
  pass: {
    borderColor: '#F1CACA',
  },
  save: {
    borderColor: '#D8CEFF',
  },
  passLabel: {
    color: theme.colors.danger,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  saveLabel: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
