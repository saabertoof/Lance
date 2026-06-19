import { useFocusEffect } from '@react-navigation/native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_BOTTOM_GAP = 8;
export const FLOATING_TAB_BAR_CONTENT_GAP = 16;

type AdaptiveTabBarContextValue = {
  compact: boolean;
  contentBottomInset: number;
  expand: () => void;
  keyboardVisible: boolean;
  reduceMotion: boolean;
  shrink: () => void;
};

const AdaptiveTabBarContext =
  createContext<AdaptiveTabBarContextValue | null>(null);

export function AdaptiveTabBarProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const expand = useCallback(() => setCompact(false), []);
  const shrink = useCallback(() => {
    if (!reduceMotion) setCompact(true);
  }, [reduceMotion]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotion(enabled);
          if (enabled) setCompact(false);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
        if (enabled) setCompact(false);
      },
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setCompact(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const value = useMemo(
    () => ({
      compact,
      contentBottomInset:
        FLOATING_TAB_BAR_HEIGHT +
        Math.max(insets.bottom, FLOATING_TAB_BAR_BOTTOM_GAP) +
        FLOATING_TAB_BAR_CONTENT_GAP,
      expand,
      keyboardVisible,
      reduceMotion,
      shrink,
    }),
    [
      compact,
      expand,
      insets.bottom,
      keyboardVisible,
      reduceMotion,
      shrink,
    ],
  );

  return (
    <AdaptiveTabBarContext.Provider value={value}>
      {children}
    </AdaptiveTabBarContext.Provider>
  );
}

export function useAdaptiveTabBar() {
  const context = useContext(AdaptiveTabBarContext);
  if (!context) {
    throw new Error(
      'useAdaptiveTabBar must be used inside AdaptiveTabBarProvider.',
    );
  }
  return context;
}

export function useOptionalAdaptiveTabBar() {
  return useContext(AdaptiveTabBarContext);
}

export function useAdaptiveTabBarScroll() {
  const context = useContext(AdaptiveTabBarContext);
  const expand = context?.expand;
  const keyboardVisible = context?.keyboardVisible ?? false;
  const reduceMotion = context?.reduceMotion ?? false;
  const shrink = context?.shrink;
  const lastOffset = useRef(0);
  const direction = useRef<'down' | 'up' | null>(null);
  const distance = useRef(0);

  const reset = useCallback(() => {
    lastOffset.current = 0;
    direction.current = null;
    distance.current = 0;
    expand?.();
  }, [expand]);

  useFocusEffect(
    useCallback(() => {
      reset();
      return undefined;
    }, [reset]),
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!expand || !shrink || reduceMotion || keyboardVisible) return;
      const nextOffset = Math.max(0, event.nativeEvent.contentOffset.y);

      if (nextOffset <= 4) {
        lastOffset.current = nextOffset;
        direction.current = null;
        distance.current = 0;
        expand();
        return;
      }

      const delta = nextOffset - lastOffset.current;
      lastOffset.current = nextOffset;
      if (Math.abs(delta) < 2) return;

      const nextDirection = delta > 0 ? 'down' : 'up';
      if (direction.current !== nextDirection) {
        direction.current = nextDirection;
        distance.current = 0;
      }
      distance.current += Math.abs(delta);

      if (nextDirection === 'down' && distance.current >= 24) {
        shrink();
        distance.current = 0;
      } else if (nextDirection === 'up' && distance.current >= 14) {
        expand();
        distance.current = 0;
      }
    },
    [expand, keyboardVisible, reduceMotion, shrink],
  );

  return { onScroll, reset };
}
