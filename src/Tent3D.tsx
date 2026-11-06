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

export interface TentEmptySlot {
  id: string;
  row: number;
  col: number;
  onPress?: () => void;
}

interface Props {
  items: TentItem[];
  emptySlots?: TentEmptySlot[];
  rows: number;
  cols: number;
  /** Medidas reales: sin ellas, se dibuja como una carpa de 80 × 80 × 160. */
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
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
const REF_SIDE_CM = 80;
const REF_HEIGHT_CM = 160;
const POT_UNITS = 0.27; // ancho de la maceta en las unidades del render
const POT_WALL = 0.62; // alto de la maceta vacía, relativo a su ancho
const MIN_TOUCH = 44;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Un círculo acostado se proyecta igual desde cualquier ángulo: por eso la maceta no depende del giro.
function FlatCircle({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scaleY: COS_A }],
      }}
    />
  );
}

function EmptyPot({ sx, sy, size }: { sx: number; sy: number; size: number }) {
  const wall = size * POT_WALL;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <FlatCircle cx={sx} cy={sy + 1} size={size * 1.25} color={colors.bgDeep} />
      <FlatCircle cx={sx} cy={sy} size={size} color={colors.pot} />
      <View
        style={{
          position: 'absolute',
          left: sx - size / 2,
          top: sy - wall,
          width: size,
          height: wall,
          backgroundColor: colors.pot,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.potEdge,
        }}
      />
      <FlatCircle cx={sx} cy={sy - wall} size={size} color={colors.potRim} />
      <FlatCircle cx={sx} cy={sy - wall} size={size * 0.8} color={colors.bgDeep} />
    </View>
  );
}

export function Tent3D({
  items,
  emptySlots = [],
  rows,
  cols,
  widthCm = REF_SIDE_CM,
  depthCm = REF_SIDE_CM,
  heightCm = REF_HEIGHT_CM,
  height = 340,
  onPressPlant,
}: Props) {
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

  // La carpa crece poco con las medidas: alcanza para notar el cambio sin que se salga de la vista.
  const longSide = Math.max(widthCm, depthCm);
  const floorSize = FLOOR * clamp(Math.pow(longSide / REF_SIDE_CM, 0.35), 0.8, 1.15);
  const floorW = floorSize * Math.max(0.35, widthCm / longSide);
  const floorD = floorSize * Math.max(0.35, depthCm / longSide);
  const tentH = TENT_H * clamp(heightCm / REF_HEIGHT_CM, 0.8, 1.15);
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);

  const cx = width / 2;
  // Se baja el piso solo si el techo de una carpa grande quedaría cortado.
  const cy = Math.max(height / 2 + 62, tentH * SIN_A + (Math.hypot(floorW, floorD) / 2) * COS_A + 6);
  const r = (theta * Math.PI) / 180;
  const cosR = Math.cos(r);
  const sinR = Math.sin(r);
  const project = (x: number, y: number, z: number) => {
    const xr = x * cosR - y * sinR;
    const yr = x * sinR + y * cosR;
    return { sx: cx + xr, sy: cy + yr * COS_A - z * SIN_A, depth: yr };
  };

  const cellW = floorW / safeCols;
  const cellH = floorD / safeRows;
  // Escala de la planta según la celda más chica, con tope para carpas de pocas macetas.
  const pxPerUnit = Math.min(Math.min(cellW, cellH) * 1.8, 190 * (floorSize / FLOOR));
  const spriteSize = pxPerUnit * SPRITE_UNITS;
  const plantW = pxPerUnit * 0.7;
  const plantH = pxPerUnit;
  const potSize = Math.max(14, pxPerUnit * POT_UNITS);

  const place = (row: number, col: number) =>
    project((col + 0.5) * cellW - floorW / 2, (row + 0.5) * cellH - floorD / 2, 0);

  // Plantas y macetas vacías comparten el orden de profundidad.
  const scene = [
    ...items.map((it) => ({ kind: 'plant' as const, it, ...place(it.row, it.col) })),
    ...emptySlots.map((slot) => ({ kind: 'slot' as const, slot, ...place(slot.row, slot.col) })),
  ].sort((a, b) => a.depth - b.depth);

  const corners = [
    [-floorW / 2, -floorD / 2],
    [floorW / 2, -floorD / 2],
    [floorW / 2, floorD / 2],
    [-floorW / 2, floorD / 2],
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
          left: cx - floorW / 2,
          top: cy - floorD / 2,
          width: floorW,
          height: floorD,
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
            top: c.sy - tentH * SIN_A,
            width: 1,
            height: tentH * SIN_A,
            backgroundColor: 'rgba(242,245,238,0.16)',
          }}
        />
      ))}
      {/* Marco superior y panel de luz */}
      <View
        style={{
          position: 'absolute',
          left: cx - floorW / 2,
          top: cy - floorD / 2,
          width: floorW,
          height: floorD,
          borderWidth: 1,
          borderColor: 'rgba(242,245,238,0.16)',
          transform: planeTransform(tentH),
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - floorW * 0.35,
          top: cy - floorD * 0.35,
          width: floorW * 0.7,
          height: floorD * 0.7,
          borderRadius: 8,
          backgroundColor: 'rgba(184,224,122,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(184,224,122,0.45)',
          transform: planeTransform(tentH - 4),
        }}
      />

      {/* Plantas y macetas vacías, de atrás hacia adelante */}
      {scene.map((entry, i) => {
        const { sx, sy } = entry;
        if (entry.kind === 'slot') {
          const { slot } = entry;
          const wall = potSize * POT_WALL;
          const touchW = Math.max(MIN_TOUCH, potSize);
          const touchH = Math.max(MIN_TOUCH, wall + potSize * COS_A);
          return (
            <React.Fragment key={`slot-${slot.id}`}>
              <EmptyPot sx={sx} sy={sy} size={potSize} />
              {slot.onPress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Maceta vacía, fila ${slot.row + 1}, columna ${slot.col + 1}`}
                  onPress={slot.onPress}
                  style={{
                    position: 'absolute',
                    left: sx - touchW / 2,
                    top: sy - wall / 2 - touchH / 2,
                    width: touchW,
                    height: touchH,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        }
        const { it } = entry;
        const labelTop = sy - plantH - 8;
        return (
          <React.Fragment key={`plant-${it.id}`}>
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
