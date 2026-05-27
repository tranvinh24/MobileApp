import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { formatViHealthNumber } from '../utils/healthFormat';

const METRICS = [
  { key: 'bloodGlucose', label: 'Đường huyết', unit: 'mmol/L', color: '#0d9488', pick: (e) => e.bloodGlucose },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#ca8a04', pick: (e) => e.temperature },
  { key: 'weight', label: 'Cân nặng', unit: 'kg', color: '#7c3aed', pick: (e) => e.weight },
  { key: 'heartRate', label: 'Nhịp tim', unit: 'bpm', color: '#dc2626', pick: (e) => e.heartRate },
];

function buildSeries(entries, pick, maxPoints = 24) {
  const chronological = [...entries].reverse();
  const raw = chronological
    .map((e) => ({ at: e.recordedAt, v: pick(e) }))
    .filter((p) => p.v != null && !Number.isNaN(Number(p.v)));
  return raw.slice(-maxPoints);
}

function LineSeg({ x1, y1, x2, y2, color, thickness = 2.5 }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 0;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x1,
        top: y1,
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ translateY: -thickness / 2 }, { rotate: `${angleDeg}deg` }],
        transformOrigin: 'left center',
      }}
    />
  );
}

export default function HealthTrendChart({ entries }) {
  const { width: winW } = useWindowDimensions();
  const [metricKey, setMetricKey] = useState('bloodGlucose');
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];

  const series = useMemo(() => buildSeries(entries, metric.pick), [entries, metric]);

  const chartW = Math.min(winW - 32, 400);
  const chartH = 140;
  const pad = { t: 12, r: 12, b: 28, l: 12 };
  const innerW = chartW - pad.l - pad.r;
  const innerH = chartH - pad.t - pad.b;

  const { pts, yMin, yMax, gridY } = useMemo(() => {
    if (series.length < 2) {
      return { pts: [], yMin: 0, yMax: 1, gridY: [] };
    }
    const vals = series.map((s) => Number(s.v));
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (minV === maxV) {
      minV -= 1;
      maxV += 1;
    }
    const span = maxV - minV;
    const padY = span * 0.08 || 0.01;
    const y0 = minV - padY;
    const y1 = maxV + padY;
    const n = series.length;
    const points = series.map((s, i) => {
      const x = pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const yn = (Number(s.v) - y0) / (y1 - y0);
      const y = pad.t + innerH - yn * innerH;
      return { x, y, v: s.v };
    });
    const gridY = [0, 0.5, 1].map((t) => pad.t + innerH * (1 - t));
    return { pts: points, yMin: y0, yMax: y1, gridY };
  }, [series, pad.l, pad.t, innerW, innerH]);

  if (!entries?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Xu hướng chỉ số</Text>
      <View style={styles.tabs}>
        {METRICS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.tab, metricKey === m.key && styles.tabActive]}
            onPress={() => setMetricKey(m.key)}
          >
            <Text style={[styles.tabText, metricKey === m.key && styles.tabTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {series.length < 2 ? (
        <Text style={styles.hint}>
          Cần ít nhất 2 lần đo có {metric.label.toLowerCase()} để xem biểu đồ.
        </Text>
      ) : (
        <>
          <View style={[styles.chartBox, { width: chartW, height: chartH }]}>
            {gridY.map((gy, i) => (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  styles.gridLine,
                  { left: pad.l, top: gy, width: innerW },
                ]}
              />
            ))}
            {pts.map((p, i) =>
              i > 0 ? (
                <LineSeg
                  key={`seg-${i}`}
                  x1={pts[i - 1].x}
                  y1={pts[i - 1].y}
                  x2={p.x}
                  y2={p.y}
                  color={metric.color}
                />
              ) : null
            )}
            {pts.map((p, i) => (
              <View
                key={`dot-${i}`}
                pointerEvents="none"
                style={[
                  styles.dot,
                  {
                    left: p.x - 4,
                    top: p.y - 4,
                    backgroundColor: metric.color,
                    borderColor: '#fff',
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.axisRow}>
            <Text style={styles.axisText} numberOfLines={1}>
              {formatViHealthNumber(yMax)} {metric.unit}
            </Text>
            <Text style={styles.axisText} numberOfLines={1}>
              {formatViHealthNumber(yMin)} {metric.unit}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: { backgroundColor: '#ccfbf1', borderColor: '#0d9488' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  tabTextActive: { color: '#0f766e' },
  hint: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  chartBox: { position: 'relative', alignSelf: 'center' },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  axisText: { fontSize: 11, color: '#9ca3af', maxWidth: '48%' },
});
