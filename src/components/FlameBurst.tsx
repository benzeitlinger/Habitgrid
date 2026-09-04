import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/Icon';

type Props = { size: number };

/**
 * A brief celebratory pop over a cell — scales in past 1, settles, then
 * fades. Purely decorative: `pointerEvents="none"` so it never intercepts
 * the tap that's already landing on the cell underneath it, and it unmounts
 * itself (the parent clears the triggering state on a timer that matches
 * this animation's length), so nothing lingers if re-tapped mid-animation.
 *
 * Always white with a soft dark halo, deliberately not `habit.color`: the
 * cell it sits on is already filled with that exact colour at full opacity
 * once the streak lands, so a same-colour flame would be invisible on top
 * of it. White plus a shadow reads on every colour in the palette.
 */
export function FlameBurst({ size }: Props) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 220, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 480 }),
      withTiming(0, { duration: 260 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.center, style]}
    >
      <Icon
        name="ui-flame-fill"
        size={Math.round(size * 0.62)}
        color="#FFFFFF"
        style={styles.glow}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
