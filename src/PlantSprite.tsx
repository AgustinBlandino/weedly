import React from 'react';
import { Image, View } from 'react-native';
import type { Phase } from './types';

// Hojas de sprites con la planta renderizada en Blender, girando sobre su eje.
const FLORA = require('../assets/plants/flora.webp');
const SHEETS: Record<Phase, number> = {
  germinacion: require('../assets/plants/germinacion.webp'),
  vege: require('../assets/plants/vege.webp'),
  flora: FLORA,
  // No hay render de planta cosechada: se sigue viendo la última.
  secado: FLORA,
  curado: FLORA,
};
const EMPTY_POT = require('../assets/plants/maceta.webp');
const FRAMES = 48;
const COLS = 7;

/** Lado del cuadro, en las unidades del render (la maceta mide 0,27). */
export const SPRITE_UNITS = 1.25;
/** Altura de la base de la maceta dentro del cuadro, de 0 (arriba) a 1 (abajo). */
export const SPRITE_ANCHOR_Y = 0.819;
/** Alto aproximado de cada planta, en las unidades del render. */
export const SPRITE_HEIGHT: Record<Phase, number> = {
  germinacion: 0.45,
  vege: 0.75,
  flora: 1,
  secado: 1,
  curado: 1,
};

function Frame({ sheet, index, size, opacity }: { sheet: number; index: number; size: number; opacity?: number }) {
  return (
    <Image
      source={sheet}
      fadeDuration={0}
      resizeMethod="scale"
      style={{
        position: 'absolute',
        left: -(index % COLS) * size,
        top: -Math.floor(index / COLS) * size,
        width: COLS * size,
        height: COLS * size,
        opacity,
      }}
    />
  );
}

/** Muestra la planta vista desde `angle` grados, fundiendo los dos cuadros más cercanos. */
export function PlantSprite({ angle, size, phase = 'flora' }: { angle: number; size: number; phase?: Phase }) {
  const pos = (((angle / 360) * FRAMES) % FRAMES + FRAMES) % FRAMES;
  const from = Math.floor(pos);
  const to = (from + 1) % FRAMES;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Frame sheet={SHEETS[phase]} index={from} size={size} />
      <Frame sheet={SHEETS[phase]} index={to} size={size} opacity={pos - from} />
    </View>
  );
}

/** La maceta es redonda: un solo cuadro sirve para cualquier ángulo. */
export function EmptyPotSprite({ size }: { size: number }) {
  return <Image source={EMPTY_POT} fadeDuration={0} resizeMethod="scale" style={{ width: size, height: size }} />;
}
