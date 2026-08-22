import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { MONTH_LABELS } from '@/lib/date';
import { colors, withAlpha } from '@/theme';

type Props = {
  /** One value per month, 12 entries. */
  values: number[];
  color: string;
  height?: number;
  width: number;
};

/**
 * Smoothed area chart. Hand-rolled rather than pulling in a chart library:
 * it is one path, and it keeps the web preview dependency-free.
 */
export function AreaChart({ values, color, width, height = 150 }: Props) {
  const pad = { left: 6, right: 6, top: 10, bottom: 6 };
  const w = Math.max(1, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...values);

  const points = values.map((v, i) => ({
    x: pad.left + (i / (values.length - 1)) * w,
    y: pad.top + h - (v / max) * h,
  }));

  // Clamp the curve to the plot box: without it the smoothing dips below the
  // baseline on a run of zero months, drawing a phantom negative value.
  const line = smoothPath(points, pad.top, pad.top + h);
  const area = `${line} L ${points[points.length - 1].x} ${pad.top + h} L ${points[0].x} ${pad.top + h} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#areaFill)" />
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      </Svg>

      <View style={[styles.labels, { width }]}>
        {MONTH_LABELS.map((m, i) => (
          <Text key={m} style={[styles.label, i % 2 === 1 && styles.dim]} numberOfLines={1}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

type P = { x: number; y: number };

/** Catmull-Rom converted to cubic beziers, with control points clamped. */
function smoothPath(p: P[], minY: number, maxY: number): string {
  if (p.length < 2) return '';
  const clamp = (y: number) => Math.max(minY, Math.min(maxY, y));
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  dim: { color: withAlpha('#8E8E93', 0.55) },
});
