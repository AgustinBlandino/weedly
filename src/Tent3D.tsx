import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { PlantSprite, SPRITE_ANCHOR_Y, SPRITE_UNITS } from './PlantSprite';
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
const TENT_H = 165;
const SWAY = 9; // grados de vaivén automático

export function Tent3D({ items, rows, cols, height = 340, onPressPlant }: Props) {
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
  // Escala de la planta según la celda más chica, con tope para carpas de pocas macetas.
  const pxPerUnit = Math.min(Math.min(cellW, cellH) * 1.8, 190);
  const spriteSize = pxPerUnit * SPRITE_UNITS;
  const plantW = pxPerUnit * 0.7;
  const plantH = pxPerUnit;

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

      {/* Plantas, de atrás hacia adelante */}
      {pots.map(({ it, sx, sy }, i) => {
        const labelTop = sy - plantH - 8;
        return (
          <React.Fragment key={it.id}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: sx - spriteSize / 2, top: sy - spriteSize * SPRITE_ANCHOR_Y }}
            >
              {/* Cada planta arranca en un ángulo propio para que no se vean clonadas. */}
              <PlantSprite angle={theta + (it.row * 3 + it.col * 5) * 37} size={spriteSize} />
            </View>
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
                left: sx - plantW / 2,
                top: labelTop - 4,
                width: plantW,
                height: sy - labelTop + 16,
              }}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}
