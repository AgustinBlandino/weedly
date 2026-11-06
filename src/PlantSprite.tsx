import React from 'react';
import { Image, View } from 'react-native';

// Hoja de sprites con la planta renderizada en Blender, girando sobre su eje.
const SHEET = require('../assets/plants/flora.webp');
const FRAMES = 48;
const COLS = 7;

/** Lado del cuadro, en las unidades del render (la maceta mide 0,27). */
export const SPRITE_UNITS = 1.25;
/** Altura de la base de la maceta dentro del cuadro, de 0 (arriba) a 1 (abajo). */
export const SPRITE_ANCHOR_Y = 0.819;

function Frame({ index, size, opacity }: { index: number; size: number; opacity?: number }) {
  return (
    <Image
      source={SHEET}
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
export function PlantSprite({ angle, size }: { angle: number; size: number }) {
  const pos = (((angle / 360) * FRAMES) % FRAMES + FRAMES) % FRAMES;
  const from = Math.floor(pos);
  const to = (from + 1) % FRAMES;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Frame index={from} size={size} />
      <Frame index={to} size={size} opacity={pos - from} />
    </View>
  );
}
