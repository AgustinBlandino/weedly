import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { colors, fonts } from './theme';

export interface TentItem {
  id: string; // plantId
  name: string;
  row: number;
  col: number;
  coverUri?: string;
  alert: boolean;
}

interface Props {
  items: TentItem[];
  rows: number;
  cols: number;
  height?: number;
  onPressPlant: (id: string) => void;
}

// Proyección isométrica ortográfica: giro en Z (θ) y luego inclinación α.
const ALPHA = (58 * Math.PI) / 180;
const COS_A = Math.cos(ALPHA);
const SIN_A = Math.sin(ALPHA);
const FLOOR = 190;
const TENT_H = 120;
const SWAY = 9; // grados de vaivén automático

export function Tent3D({ items, rows, cols, height = 290, onPressPlant }: Props) {
  const [width, setWidth] = useState(340);
  const [theta, setTheta] = useState(45);
  const thetaRef = useRef(45);
  const center = useRef(45);
  const phase = useRef(0);
  const dragging = useRef(false);
  const dragBase = useRef(45);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // Vaivén suave (~30 fps)
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 33) {
        const dt = last ? (t - last) / 1000 : 0;
        last = t;
        if (!dragging.current) {
          phase.current += dt * 0.5;
          const next = center.current + SWAY * Math.sin(phase.current);
          thetaRef.current = next;
          setTheta(next);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          dragBase.current = thetaRef.current;
        },
        onPanResponderMove: (_, g) => {
          const next = dragBase.current + g.dx * 0.6;
          thetaRef.current = next;
          setTheta(next);
        },
        onPanResponderRelease: () => {
          dragging.current = false;
          center.current = thetaRef.current - SWAY * Math.sin(phase.current);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          center.current = thetaRef.current - SWAY * Math.sin(phase.current);
        },
      }),
    [],
  );

  // Etiquetas que flotan
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduceMotion]);

  const cx = width / 2;
  const cy = height / 2 + 62;
  const r = (theta * Math.PI) / 180;
  const cosR = Math.cos(r);
  const sinR = Math.sin(r);
  const project = (x: number, y: number, z: number) => {
    const xr = x * cosR - y * sinR;
    const yr = x * sinR + y * cosR;
    return { sx: cx + xr, sy: cy + yr * COS_A - z * SIN_A, depth: yr };
  };

  const cellW = FLOOR / cols;
  const cellH = FLOOR / rows;
  const D = Math.min(cellW, cellH) * 0.72;

  const pots = items
    .map((it) => {
      const x = (it.col + 0.5) * cellW - FLOOR / 2;
      const y = (it.row + 0.5) * cellH - FLOOR / 2;
      return { it, ...project(x, y, 0) };
    })
    .sort((a, b) => a.depth - b.depth);

  const corners = [
    [-FLOOR / 2, -FLOOR / 2],
    [FLOOR / 2, -FLOOR / 2],
    [FLOOR / 2, FLOOR / 2],
    [-FLOOR / 2, FLOOR / 2],
  ].map(([x, y]) => project(x, y, 0));

  const planeTransform = (z: number) => [
    { translateY: -z * SIN_A },
    { scaleY: COS_A },
    { rotateZ: `${theta}deg` },
  ];

  const ellipse = (sx: number, sy: number, z: number, d: number, bg: string, border?: string) => (
    <View
      style={{
        position: 'absolute',
        left: sx - d / 2,
        top: sy - z * SIN_A - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: bg,
        borderWidth: border ? 1 : 0,
        borderColor: border,
        transform: [{ scaleY: COS_A }],
      }}
    />
  );

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={{ height, overflow: 'hidden' }} {...pan.panHandlers}>
      {/* Piso */}
      <View
        style={{
          position: 'absolute',
          left: cx - FLOOR / 2,
          top: cy - FLOOR / 2,
          width: FLOOR,
          height: FLOOR,
          borderRadius: 6,
          backgroundColor: colors.cardAlt,
          borderWidth: 1,
          borderColor: '#3A423A',
          transform: planeTransform(0),
        }}
      />
      {/* Parantes de la carpa */}
      {corners.map((c, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: c.sx - 0.5,
            top: c.sy - TENT_H * SIN_A,
            width: 1,
            height: TENT_H * SIN_A,
            backgroundColor: 'rgba(242,245,238,0.16)',
          }}
        />
      ))}
      {/* Marco superior y panel de luz */}
      <View
        style={{
          position: 'absolute',
          left: cx - FLOOR / 2,
          top: cy - FLOOR / 2,
          width: FLOOR,
          height: FLOOR,
          borderWidth: 1,
          borderColor: 'rgba(242,245,238,0.16)',
          transform: planeTransform(TENT_H),
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - FLOOR * 0.35,
          top: cy - FLOOR * 0.35,
          width: FLOOR * 0.7,
          height: FLOOR * 0.7,
          borderRadius: 8,
          backgroundColor: 'rgba(184,224,122,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(184,224,122,0.45)',
          transform: planeTransform(TENT_H - 4),
        }}
      />

      {/* Macetas, de atrás hacia adelante */}
      {pots.map(({ it, sx, sy }, i) => {
        const ring = it.alert ? colors.flora : colors.leafLight;
        const labelTop = sy - 64 * SIN_A - 11;
        return (
          <React.Fragment key={it.id}>
            {ellipse(sx, sy, 0, D, '#1A1714')}
            {[5, 10, 15, 20].map((z) => (
              <React.Fragment key={z}>{ellipse(sx, sy, z, D, colors.pot, colors.potEdge)}</React.Fragment>
            ))}
            {ellipse(sx, sy, 25, D, colors.potRim)}
            {it.coverUri ? (
              <Image
                source={{ uri: it.coverUri }}
                style={{
                  position: 'absolute',
                  left: sx - (D + 10) / 2,
                  top: sy - 40 * SIN_A - (D + 10) / 2,
                  width: D + 10,
                  height: D + 10,
                  borderRadius: (D + 10) / 2,
                  borderWidth: 2,
                  borderColor: ring,
                  transform: [{ scaleY: COS_A }],
                }}
              />
            ) : (
              <>
                {ellipse(sx, sy, 34, D + 10, colors.leafDark, ring)}
                {ellipse(sx, sy, 44, D * 0.65, colors.leaf)}
                {ellipse(sx, sy, 52, D * 0.32, colors.leafLight)}
              </>
            )}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: sx - 20,
                top: labelTop,
                width: 40,
                height: 22,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: it.alert ? colors.flora : colors.bg,
                transform: [
                  {
                    translateY: bob.interpolate({
                      inputRange: [0, 1],
                      outputRange: i % 2 === 0 ? [0, -5] : [-5, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: it.alert ? colors.bg : colors.text }}>
                {it.name}
              </Text>
            </Animated.View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${it.name}`}
              onPress={() => onPressPlant(it.id)}
              style={{
                position: 'absolute',
                left: sx - D / 2 - 6,
                top: labelTop - 4,
                width: D + 12,
                height: sy + (D * COS_A) / 2 - labelTop + 6,
              }}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}
