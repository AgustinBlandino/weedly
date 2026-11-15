import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ILLUSTRATION_SIZE, PhaseIllustration } from './PhaseIllustration';
import type { PlantCardData } from './selectors';
import { CARD_COLORS as K, cardTypo, PHASE_CARD_COLORS } from './theme';
import { PHASE_LABEL, type Photo } from './types';
import { flavorPhrase, fmtCannabinoid } from './utils';

/** Tamaño lógico de la historia 9:16. Capturada a 3x sale en 1080x1920. */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

const CROMO_WIDTH = 300;
const CROMO_HEIGHT = 524;
const WINDOW_MIN = 196;

export interface PlantCardShow {
  harvest: boolean;
  cannabinoids: boolean;
  tastes: boolean;
}

// --- Color: mezclas para el foil, el fondo de la ventana y el tono de la fase legible sobre crema. ---

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Mezcla `hex` con `to` en proporción `t` (0 = hex, 1 = to). */
function mix(hex: string, to: string, t: number): string {
  const a = rgb(hex);
  const b = rgb(to);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

const WHITE = K.onPhase;
const BLACK = K.shadow;
const lighten = (hex: string, t: number) => mix(hex, WHITE, t);
const darken = (hex: string, t: number) => mix(hex, BLACK, t);

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Oscurece el color de la fase hasta que el texto blanco (o el crema) tenga buen contraste. */
function phaseInk(hex: string): string {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = darken(hex, t);
    if (1.05 / (luminance(c) + 0.05) >= 5.5) return c;
  }
  return BLACK;
}

const plural = (n: number) => (n === 1 ? 'día' : 'días');

/**
 * Cromo de una planta: la historia 9:16 completa, a tamaño lógico fijo (360x640), con la carta
 * coleccionable de 300x524 en el centro. Es puro: no lee el store, todo llega por props. Avisa con
 * `onImageLoad` cuando la foto ya está dibujada (o falló) para no capturar antes de tiempo.
 */
export function PlantCard({
  data,
  photo,
  show,
  onImageLoad,
}: {
  data: PlantCardData;
  photo?: Photo;
  show: PlantCardShow;
  onImageLoad?: () => void;
}) {
  const c = PHASE_CARD_COLORS[data.phase];
  const ink = phaseInk(c.frame);
  const g = data.genetic;
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const [windowH, setWindowH] = useState(WINDOW_MIN);

  const photoUri = photo && photo.uri !== failedUri ? photo.uri : undefined;
  // Foto que ya falló (recién, o al volver a elegirla después de otra): no se monta <Image>, así que
  // se avisa desde acá para que la pantalla no quede esperando un onLoad que nunca llega.
  const photoFailed = !!photo && photo.uri === failedUri;
  useEffect(() => {
    if (photoFailed) onImageLoad?.();
  }, [photoFailed, photo?.uri]);

  const title = g?.name.trim() || data.name;
  const breeder = g ? g.breeder.trim() : 'Genética desconocida';
  const floweringDays = g?.floweringDays;
  const showHarvest = show.harvest && data.floraRemaining != null && !!floweringDays;
  const showVege = data.vegeDays > 0 && (data.phase === 'flora' || data.phase === 'secado' || data.phase === 'curado');

  const stats: { label: string; value: string }[] = [];
  const thc = g?.thc?.trim();
  const cbd = g?.cbd?.trim();
  if (show.cannabinoids && thc) stats.push({ label: 'THC', value: fmtCannabinoid(thc) });
  if (show.cannabinoids && cbd) stats.push({ label: 'CBD', value: fmtCannabinoid(cbd) });
  if (floweringDays) stats.push({ label: 'FLORA', value: `${Math.max(1, Math.round(floweringDays / 7))} sem` });

  const phrase = show.tastes && g ? flavorPhrase(g.flavors, g.effects) : '';
  const endedLabel = data.ended ? (data.phase === 'secado' || data.phase === 'curado' ? 'COSECHADA' : 'FINALIZADA') : undefined;

  // Sin genética no hay color propio: la ventana toma el de la fase.
  const base = data.geneticColor ?? lighten(c.frame, 0.3);
  // La ilustración crece un poco si la ventana absorbe el espacio de bloques apagados.
  const artSize = ILLUSTRATION_SIZE[data.phase] * Math.max(1, Math.min(1.3, (windowH - 6) / (WINDOW_MIN - 6)));

  return (
    <View style={[styles.story, { backgroundColor: c.bg }]}>
      <View style={[styles.glow, { width: 420, height: 420, borderRadius: 210, top: -120, left: -160, backgroundColor: c.frame, opacity: 0.18 }]} />
      <View style={[styles.glow, { width: 360, height: 360, borderRadius: 180, bottom: -140, right: -150, backgroundColor: c.accent, opacity: 0.12 }]} />

      <View style={[styles.card, { backgroundColor: c.frame }]}>
        <LinearGradient
          colors={[lighten(c.frame, 0.3), lighten(c.accent, 0.3), c.frame, c.accent]}
          locations={[0, 0.45, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
        />
        <View style={styles.panel}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={{ flexShrink: 1, gap: 3 }}>
              <View style={[styles.pill, { backgroundColor: ink }]}>
                <Text style={{ ...cardTypo.pill, color: K.onPhase }}>{PHASE_LABEL[data.phase].toUpperCase()}</Text>
              </View>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5} style={{ ...cardTypo.title, color: K.ink }}>
                {title}
              </Text>
              {breeder ? (
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...cardTypo.breeder, color: K.goldInk }}>
                  {breeder.toUpperCase()}
                </Text>
              ) : null}
            </View>
            <View style={styles.day}>
              <Text style={{ ...cardTypo.dayLabel, color: ink }}>DÍA</Text>
              <Text style={{ ...cardTypo.dayNumber, color: ink }}>{data.dayOfLife}</Text>
            </View>
          </View>

          {/* Ventana de imagen: absorbe el alto que dejan libre los bloques apagados. */}
          <View style={styles.window} onLayout={(e) => setWindowH(e.nativeEvent.layout.height)}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="cromoWindow" cx="50%" cy="40%" r="75%" fx="50%" fy="40%">
                  <Stop offset="0" stopColor={lighten(base, 0.6)} />
                  <Stop offset="0.7" stopColor={base} />
                  <Stop offset="1" stopColor={darken(base, 0.12)} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#cromoWindow)" />
            </Svg>
            {photoUri ? (
              <Image
                key={photoUri}
                source={{ uri: photoUri }}
                resizeMode="cover"
                fadeDuration={0}
                style={StyleSheet.absoluteFill}
                onLoad={() => onImageLoad?.()}
                // Si la foto ya no está en el teléfono, se usa la ilustración de la fase (el efecto de arriba avisa).
                onError={() => setFailedUri(photoUri)}
              />
            ) : (
              <PhaseIllustration phase={data.phase} size={artSize} />
            )}

            <View style={styles.stamps}>
              {data.seedSex ? <Stamp label={data.seedSex} color={ink} /> : null}
              <Stamp label={data.plantType === 'auto' ? 'AUTO' : 'FOTO'} color={ink} small />
            </View>
            {endedLabel ? (
              <View style={styles.ended}>
                <Text style={{ ...cardTypo.stamp, letterSpacing: 1, color: ink }}>{endedLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Fases */}
          <View style={{ gap: 5 }}>
            <PhaseRow color={ink} label={PHASE_LABEL[data.phase]} value={`día ${data.dayInPhase}`} />
            {showHarvest && floweringDays ? (
              <HarvestBar remaining={data.floraRemaining!} total={floweringDays} fill={c.accent} />
            ) : null}
            {showVege ? (
              <>
                <View style={styles.divider} />
                <PhaseRow color={PHASE_CARD_COLORS.vege.frame} label={PHASE_LABEL.vege} value={`${data.vegeDays} ${plural(data.vegeDays)}`} />
              </>
            ) : null}
          </View>

          {/* Fila técnica */}
          {stats.length ? (
            <View style={styles.stats}>
              {stats.map((st, i) => (
                <View key={st.label} style={[styles.statCell, i > 0 && styles.statDivider]}>
                  <Text style={{ ...cardTypo.statLabel, color: K.label }}>{st.label}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...cardTypo.statValue, color: K.ink }}>
                    {st.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {phrase ? (
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...cardTypo.phrase, color: K.inkSoft }}>
              {phrase}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={{ ...cardTypo.footer, color: K.cream }}>weedly</Text>
    </View>
  );
}

function Stamp({ label, color, small = false }: { label: string; color: string; small?: boolean }) {
  return (
    <View style={styles.stamp}>
      <Text style={{ ...(small ? cardTypo.stampSmall : cardTypo.stamp), color }}>{label}</Text>
    </View>
  );
}

function PhaseRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={{ ...cardTypo.phaseName, color: K.ink, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ ...cardTypo.phaseDays, color: K.ink }}>{value}</Text>
    </View>
  );
}

function HarvestBar({ remaining, total, fill }: { remaining: number; total: number; fill: string }) {
  const fraction = Math.min(1, Math.max(0, (total - remaining) / total));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 26 }}>
      <View style={styles.track}>
        <View style={{ width: `${fraction * 100}%`, height: '100%', borderRadius: 3, backgroundColor: fill }} />
      </View>
      <Text style={{ ...cardTypo.progress, color: K.inkMuted }}>
        {remaining > 0 ? `faltan ~${remaining} ${plural(remaining)}` : 'lista para cosechar'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  story: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    overflow: 'hidden',
  },
  glow: { position: 'absolute' },
  card: {
    width: CROMO_WIDTH,
    height: CROMO_HEIGHT,
    padding: 8,
    borderRadius: 18,
    shadowColor: K.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  panel: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: K.cream,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  day: { flexDirection: 'row', alignItems: 'baseline', gap: 3, flexShrink: 0 },
  window: {
    flex: 1,
    minHeight: WINDOW_MIN,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: K.gold,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stamps: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  stamp: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: K.gold,
    backgroundColor: K.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ended: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: K.gold,
    backgroundColor: K.cream,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: K.track, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: K.divider },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: K.divider,
    paddingVertical: 5,
  },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: K.divider },
});
