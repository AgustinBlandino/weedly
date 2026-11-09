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
import { EmptyPotSprite, PlantSprite, SPRITE_ANCHOR_Y, SPRITE_HEIGHT, SPRITE_UNITS } from './PlantSprite';
import { colors, fonts } from './theme';
import type { Phase } from './types';

export interface TentItem {
  id: string; // plantId
  name: string;
  row: number;
  col: number;
  coverUri?: string;
  alert: boolean;
  phase?: Phase;
  /** Color de la genética, para reconocerla sin depender del nombre. */
  color?: string;
  geneticName?: string;
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
  /** Estado de la luminaria. Sin dato se dibuja encendida, con el blanco cálido del LED. */
  lighting?: { on: boolean; warm?: boolean };
  onPressPlant: (id: string) => void;
}

/** '#RRGGBB' del tema → 'rgba(r,g,b,a)' para halos y transparencias. */
const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

interface LampPalette {
  diode: string;
  bar: string;
  frameBorder: string;
}

const LAMP_OFF: LampPalette = {
  diode: colors.border,
  bar: colors.card,
  frameBorder: alpha(colors.text, 0.22),
};
const LAMP_LED: LampPalette = {
  diode: colors.text,
  bar: alpha(colors.lime, 0.2),
  frameBorder: alpha(colors.lime, 0.55),
};
const LAMP_WARM: LampPalette = {
  diode: colors.flora,
  bar: alpha(colors.flora, 0.22),
  frameBorder: alpha(colors.flora, 0.55),
};

// Proyección isométrica ortográfica: giro en Z (θ) y luego inclinación α.
const ALPHA = (58 * Math.PI) / 180;
const COS_A = Math.cos(ALPHA);
const SIN_A = Math.sin(ALPHA);
const FLOOR = 228;
const TENT_H = 198;
const SIDE_GAP = 12; // aire a cada lado de la carpa
const BOTTOM_GAP = 22; // lugar para el texto "FRENTE"
const TOP_GAP = 8;
const SWAY = 9; // grados de vaivén automático
const REF_SIDE_CM = 80;
const REF_HEIGHT_CM = 160;
const POT_UNITS = 0.27; // ancho de la maceta en las unidades del render
const POT_WALL = 0.62; // alto de la maceta vacía, relativo a su ancho
const MIN_TOUCH = 44;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function Tent3D({
  items,
  emptySlots = [],
  rows,
  cols,
  widthCm = REF_SIDE_CM,
  depthCm = REF_SIDE_CM,
  heightCm = REF_HEIGHT_CM,
  height = 340,
  lighting,
  onPressPlant,
}: Props) {
  const lightOn = lighting?.on ?? true;
  const lightWarm = lightOn && !!lighting?.warm;
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

  // Pulso muy leve del brillo de la luminaria encendida
  const glow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    glow.setValue(1);
    if (reduceMotion || !lightOn) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.72, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, reduceMotion, lightOn]);

  // La carpa crece poco con las medidas: alcanza para notar el cambio sin que se salga de la vista.
  const longSide = Math.max(widthCm, depthCm);
  const rawSize = FLOOR * clamp(Math.pow(longSide / REF_SIDE_CM, 0.35), 0.8, 1.15);
  const rawW = rawSize * Math.max(0.35, widthCm / longSide);
  const rawD = rawSize * Math.max(0.35, depthCm / longSide);
  const rawH = TENT_H * clamp(heightCm / REF_HEIGHT_CM, 0.8, 1.15);
  // Si no entra en el espacio disponible (girando, o de techo a piso), se achica todo junto.
  const rawDiag = Math.hypot(rawW, rawD);
  const fit = Math.min(
    1,
    (width - SIDE_GAP * 2) / rawDiag,
    (height - TOP_GAP - BOTTOM_GAP) / (rawH * SIN_A + rawDiag * COS_A),
  );
  const floorSize = rawSize * fit;
  const floorW = rawW * fit;
  const floorD = rawD * fit;
  const tentH = rawH * fit;
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);

  const cx = width / 2;
  const halfDiagY = (Math.hypot(floorW, floorD) / 2) * COS_A;
  // Se baja el piso solo si el techo quedaría cortado, y nunca tanto como para cortar el frente.
  const cy = Math.min(
    Math.max(height / 2 + 62, tentH * SIN_A + halfDiagY + TOP_GAP),
    height - halfDiagY - BOTTOM_GAP,
  );
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
  const pxPerUnit = Math.min(Math.min(cellW, cellH) * 1.8, floorSize);
  const spriteSize = pxPerUnit * SPRITE_UNITS;
  const plantW = pxPerUnit * 0.7;
  const plantH = pxPerUnit;
  const potSize = Math.max(14, pxPerUnit * POT_UNITS);

  // El frente es el lado y = +floorD/2; la fila 1 queda pegada a él.
  const place = (row: number, col: number) =>
    project((col + 0.5) * cellW - floorW / 2, floorD / 2 - (row + 0.5) * cellH, 0);

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

  /** Rectángulo en un plano horizontal a altura z, centrado en el eje de la carpa. */
  const plane = (w: number, d: number, z: number) => ({
    position: 'absolute' as const,
    left: cx - w / 2,
    top: cy - d / 2,
    width: w,
    height: d,
    transform: planeTransform(z),
  });

  // Luminaria: placa colgada unos cm debajo del techo, escalada con el piso.
  const lampW = floorW * 0.68;
  const lampD = floorD * 0.68;
  const hang = clamp(tentH * 0.08, 8, 16);
  const lampZ = tentH - hang;
  const lampPad = clamp(lampW * 0.05, 3, 8);
  const palette = !lightOn ? LAMP_OFF : lightWarm ? LAMP_WARM : LAMP_LED;
  const glowColor = lightWarm ? colors.flora : colors.lime;
  const hangers = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => project((sx * lampW * 0.9) / 2, (sy * lampD * 0.86) / 2, tentH));

  // Barras, diodos y driver no dependen del giro: se arman una vez por tamaño y color.
  const lampBody = useMemo(() => {
    const nBars = clamp(Math.round(lampW / 30), 4, 6);
    const pad = lampPad;
    const innerW = lampW - pad * 2 - 2;
    const barW = innerW / (nBars + (nBars - 1) * 0.9);
    const barLen = lampD - pad * 2 - 2;
    const nDiodes = clamp(Math.round(barLen / 15), 3, 6);
    const d = clamp(barW * 0.4, 2, 4);
    const drvW = clamp(floorW * 0.08, 8, 16);
    const drvD = clamp(lampD * 0.3, 10, 24);
    const gap = Math.max(3, floorW * 0.03);
    return (
      <>
        {Array.from({ length: nBars }, (_, b) => (
          <View
            key={b}
            style={{
              width: barW,
              borderRadius: 2,
              backgroundColor: palette.bar,
              alignItems: 'center',
              justifyContent: 'space-evenly',
            }}
          >
            {Array.from({ length: nDiodes }, (_, k) => (
              <View key={k} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: palette.diode }} />
            ))}
          </View>
        ))}
        {/* Cable y driver al costado */}
        <View
          style={{
            position: 'absolute',
            left: lampW - 2,
            top: lampD / 2 - 1.5,
            width: gap + 1,
            height: 1,
            backgroundColor: alpha(colors.text, 0.3),
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: lampW - 2 + gap,
            top: lampD / 2 - 1 - drvD / 2,
            width: drvW,
            height: drvD,
            borderRadius: 2,
            backgroundColor: colors.bgDeep,
            borderWidth: 1,
            borderColor: alpha(colors.text, 0.25),
          }}
        />
      </>
    );
  }, [lampW, lampD, lampPad, floorW, palette]);

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
          // El borde de abajo del piso es siempre el frente, gire como gire.
          borderBottomWidth: 3,
          borderBottomColor: colors.lime,
          transform: planeTransform(0),
        }}
      >
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: floorD + 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: fonts.bodyBold,
            fontSize: 10,
            letterSpacing: 2,
            color: colors.lime,
            opacity: 0.85,
          }}
        >
          FRENTE
        </Text>
      </View>
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
      {/* Marco superior */}
      <View
        pointerEvents="none"
        style={{
          ...plane(floorW, floorD, tentH),
          borderWidth: 1,
          borderColor: 'rgba(242,245,238,0.16)',
        }}
      />

      {/* Luz encendida: mancha en el piso, cono insinuado y halo bajo la luminaria */}
      {lightOn ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: glow }}
        >
          <View
            style={{
              ...plane(floorW * 0.88, floorD * 0.88, 0),
              borderRadius: Math.min(floorW, floorD) * 0.4,
              backgroundColor: alpha(glowColor, 0.07),
            }}
          />
          <View
            style={{
              ...plane(floorW * 0.8, floorD * 0.8, lampZ * 0.5),
              borderRadius: Math.min(floorW, floorD) * 0.3,
              backgroundColor: alpha(glowColor, 0.035),
            }}
          />
          <View
            style={{
              ...plane(lampW * 1.26, lampD * 1.26, lampZ - 5),
              borderRadius: Math.min(lampW, lampD) * 0.3,
              backgroundColor: alpha(colors.text, 0.05),
            }}
          />
          <View
            style={{
              ...plane(lampW * 1.1, lampD * 1.1, lampZ - 2),
              borderRadius: Math.min(lampW, lampD) * 0.18,
              backgroundColor: alpha(glowColor, 0.12),
            }}
          />
        </Animated.View>
      ) : null}

      {/* Luminaria: canto (da espesor), placa con barras de diodos y driver al costado */}
      <View
        pointerEvents="none"
        style={{
          ...plane(lampW, lampD, lampZ - 2.5),
          borderRadius: 4,
          backgroundColor: colors.bgDeep,
          borderWidth: 1,
          borderColor: alpha(colors.text, 0.1),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          ...plane(lampW, lampD, lampZ),
          borderRadius: 4,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: palette.frameBorder,
          padding: lampPad,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {lampBody}
      </View>
      {/* Colgadores: del techo a las esquinas de la luminaria */}
      {hangers.map((h, i) => (
        <View
          key={`hanger-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: h.sx - 0.5,
            top: h.sy,
            width: 1,
            height: hang * SIN_A,
            backgroundColor: alpha(colors.text, 0.3),
          }}
        />
      ))}

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
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: sx - spriteSize / 2, top: sy - spriteSize * SPRITE_ANCHOR_Y }}
              >
                <EmptyPotSprite size={spriteSize} />
              </View>
              {slot.onPress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Maceta vacía, fila ${slot.row + 1} desde el frente, columna ${slot.col + 1}`}
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
        const labelTop = sy - plantH * SPRITE_HEIGHT[it.phase ?? 'flora'] - 8;
        return (
          <React.Fragment key={`plant-${it.id}`}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: sx - spriteSize / 2, top: sy - spriteSize * SPRITE_ANCHOR_Y }}
            >
              {/* Cada planta arranca en un ángulo propio para que no se vean clonadas. */}
              <PlantSprite angle={theta + (it.row * 3 + it.col * 5) * 37} size={spriteSize} phase={it.phase} />
            </View>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: sx - 50,
                top: labelTop,
                width: 100,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
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
              <View
                style={{
                  height: 22,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: it.alert ? colors.flora : colors.bg,
                }}
              >
                {it.color ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: it.color,
                      borderWidth: it.alert ? 1 : 0,
                      borderColor: colors.bg,
                    }}
                  />
                ) : null}
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: it.alert ? colors.bg : colors.text }}>
                  {it.name}
                </Text>
              </View>
            </Animated.View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${it.name}${it.geneticName ? `, ${it.geneticName}` : ''}`}
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
