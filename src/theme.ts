import type { TextStyle } from 'react-native';
import type { Phase } from './types';

export const colors = {
  bg: '#121412',
  bgDeep: '#0A0C0A',
  card: '#1E221E',
  cardAlt: '#232823',
  sheet: '#1A1D1A',
  border: '#343A34',
  text: '#F2F5EE',
  textSoft: '#C9D1C6',
  muted: '#9AA597',
  lime: '#B8E07A',
  limeBg: '#2B3320',
  sage: '#477050',
  sageText: '#DCEBD8',
  green: '#3DBE4B',
  greenInk: '#0B2E10',
  leafDark: '#3F7D35',
  leaf: '#5E9E4C',
  leafLight: '#8CCB6B',
  vege: '#93BA88',
  vegeBg: '#243328',
  flora: '#E0A84B',
  floraBg: '#3A2F1A',
  pot: '#2B241E',
  potEdge: '#3D342B',
  potRim: '#4A3A2C',
  danger: '#E5735F',
};

/** Un color fijo por genética para reconocerla en la carpa. Evita el lime y el ámbar de las alertas. */
export const geneticPalette = ['#7CC4F2', '#C59BF0', '#F28FB0', '#6FD6C2', '#F2D16B', '#9DB5FF', '#FF9F7A', '#B7E36B'];

export const fonts = {
  display: 'Fraunces_700Bold',
  displaySemi: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 28 };

/**
 * Escala tipográfica. Fraunces (serif) es solo para títulos; Inter para todo lo demás, números incluidos.
 * Usá estos estilos en vez de combinar fontFamily y fontSize a mano.
 */
export const typo = {
  /** Título de las pantallas raíz (Diario, Biblioteca) y bienvenida. */
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  /** Título de pantalla. */
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  /** Título de sección (H2). */
  heading: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 24 },
  /** Subsección o encabezado de grupo (H3). */
  subheading: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22 },
  /** Número protagonista de una pantalla: VPD, litros, stepper. */
  hero: { fontFamily: fonts.bodySemi, fontSize: 30, lineHeight: 36, fontVariant: ['tabular-nums'] },
  /** Dato dentro de una grilla o tarjeta. */
  stat: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, fontVariant: ['tabular-nums'] },
  /** Texto de botón principal. */
  button: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 20 },
  /** Nombre de ítem, título de tarjeta o acción suelta. */
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  /** Texto corrido. */
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  /** Link en línea, chip, pestaña. */
  labelStrong: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  /** Etiqueta de campo o texto secundario. */
  label: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  /** Metadatos: fechas, unidades, ayudas. */
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  captionStrong: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16 },
  /** Pill o badge sobre una tarjeta o foto. */
  badge: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

/**
 * Colores del cromo de planta por fase: `frame` es el borde de la carta, `accent` los datos destacados
 * y `bg` el fondo oscuro de la historia 9:16 detrás del cromo (contrasta con texto claro).
 */
export const PHASE_CARD_COLORS: Record<Phase, { frame: string; accent: string; bg: string }> = {
  germinacion: { frame: '#A8E08A', accent: '#D4F5B8', bg: '#16241A' },
  vege: { frame: '#3DBE4B', accent: '#8CCB6B', bg: '#0F2214' },
  flora: { frame: '#9B6FD6', accent: '#E0A84B', bg: '#1D1428' },
  secado: { frame: '#C08A3E', accent: '#E0B070', bg: '#241A10' },
  curado: { frame: '#D4AF37', accent: '#F2D16B', bg: '#221C0C' },
};
