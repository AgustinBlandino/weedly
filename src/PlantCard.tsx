import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PlantSprite } from './PlantSprite';
import type { PlantCardData } from './selectors';
import { colors, PHASE_CARD_COLORS, radius, typo } from './theme';
import { PHASE_LABEL, type Photo } from './types';

/** Tamaño lógico de la historia 9:16. Capturada a 3x sale en 1080x1920. */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

const CROMO_WIDTH = 296;
const CROMO_HEIGHT = 500;
const FRAME = 6;
const MAX_TASTES = 4;

export interface PlantCardShow {
  harvest: boolean;
  cannabinoids: boolean;
  tastes: boolean;
}

/** Color del tema con transparencia (hex de 6 dígitos + alfa). */
function alpha(hex: string, a: number): string {
  return `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Hasta 4 chips: primero dos sabores y dos efectos, y si falta de uno se completa con el otro. */
export function cardTastes(flavors: string[], effects: string[]): string[] {
  const out = [...flavors.slice(0, 2), ...effects.slice(0, 2)];
  const rest = [...flavors.slice(2), ...effects.slice(2)];
  while (out.length < MAX_TASTES && rest.length) out.push(rest.shift()!);
  return out.slice(0, MAX_TASTES);
}

/** Puntitos decorativos del fondo, en coordenadas de la historia. */
const SPARKS = [
  { x: 34, y: 40, r: 3 },
  { x: 318, y: 26, r: 2 },
  { x: 330, y: 92, r: 4 },
  { x: 22, y: 128, r: 2 },
  { x: 340, y: 470, r: 2 },
  { x: 16, y: 520, r: 3 },
  { x: 300, y: 600, r: 3 },
  { x: 58, y: 612, r: 2 },
];

/**
 * Cromo de una planta: la historia 9:16 completa, a tamaño lógico fijo (360x640).
 * Es puro: no lee el store, todo llega por props. Avisa con `onImageLoad` cuando la foto ya está
 * dibujada (o cuando no hay foto que esperar) para no capturar antes de tiempo.
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
  const g = data.genetic;
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const [art, setArt] = useState({ w: 0, h: 0 });

  const photoUri = photo && photo.uri !== failedUri ? photo.uri : undefined;
  // Foto que ya falló (recién, o al volver a elegirla después de otra): no se monta <Image>, así que
  // se avisa desde acá para que la pantalla no quede esperando un onLoad que nunca llega.
  const photoFailed = !!photo && photo.uri === failedUri;
  useEffect(() => {
    if (photoFailed) onImageLoad?.();
  }, [photoFailed, photo?.uri]);
  const geneticLine = g ? [g.name, g.breeder, g.type].filter(Boolean).join(' · ') : 'Genética sin cargar';
  const floweringDays = g?.floweringDays;
  const showHarvest = show.harvest && data.floraRemaining != null && !!floweringDays;
  const thc = g?.thc?.trim();
  const cbd = g?.cbd?.trim();
  const showCannabinoids = show.cannabinoids && !!(thc || cbd);
  const tastes = g ? cardTastes(g.flavors, g.effects) : [];
  const showTastes = show.tastes && tastes.length > 0;
  const endedLabel = data.ended ? (data.phase === 'secado' || data.phase === 'curado' ? 'Cosechada' : 'Finalizada') : undefined;
  const spriteSize = Math.min(art.w, art.h);

  return (
    <View style={[styles.story, { backgroundColor: c.bg }]}>
      {/* Brillo suave detrás del cromo, en el color de la fase. */}
      <View style={[styles.glow, { width: 520, height: 520, borderRadius: 260, left: -80, top: -60, backgroundColor: alpha(c.frame, 0.1) }]} />
      <View style={[styles.glow, { width: 380, height: 380, borderRadius: 190, left: -10, top: 70, backgroundColor: alpha(c.frame, 0.1) }]} />
      <View style={[styles.glow, { width: 300, height: 300, borderRadius: 150, left: 150, top: 430, backgroundColor: alpha(c.accent, 0.07) }]} />
      {SPARKS.map((p) => (
        <View
          key={`${p.x}-${p.y}`}
          style={[styles.glow, { left: p.x, top: p.y, width: p.r * 2, height: p.r * 2, borderRadius: p.r, backgroundColor: alpha(c.accent, 0.45) }]}
        />
      ))}

      <View style={[styles.frame, { backgroundColor: c.frame, shadowColor: c.frame }]}>
        <View style={[styles.inner, { backgroundColor: c.bg }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(c.frame, 0.08) }]} />

          {/* Encabezado */}
          <View style={styles.header}>
            <View style={{ flexShrink: 1, gap: 1 }}>
              <Text style={{ ...typo.badge, color: c.accent, letterSpacing: 2.4 }}>WEEDLY</Text>
              {data.cycleName ? (
                <Text numberOfLines={1} style={{ ...typo.caption, color: colors.muted }}>
                  {data.cycleName}
                </Text>
              ) : null}
            </View>
            {data.number != null && data.total != null ? (
              <View style={[styles.number, { borderColor: alpha(c.frame, 0.6), backgroundColor: alpha(c.frame, 0.14) }]}>
                <Text style={{ ...typo.captionStrong, color: colors.text, fontVariant: ['tabular-nums'] }}>
                  #{pad(data.number)}/{pad(data.total)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Imagen */}
          <View
            style={[styles.art, { backgroundColor: alpha(c.frame, 0.14), borderColor: alpha(c.frame, 0.35) }]}
            onLayout={(e) => setArt({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            {photoUri ? (
              <Image
                key={photoUri}
                source={{ uri: photoUri }}
                resizeMode="cover"
                fadeDuration={0}
                style={StyleSheet.absoluteFill}
                onLoad={() => onImageLoad?.()}
                // Si la foto ya no está en el teléfono, se usa el render de la fase (el efecto de arriba avisa).
                onError={() => setFailedUri(photoUri)}
              />
            ) : (
              <>
                <View
                  style={[
                    styles.glow,
                    {
                      width: art.w * 0.9,
                      height: art.w * 0.9,
                      borderRadius: art.w * 0.45,
                      left: art.w * 0.05,
                      top: art.h / 2 - art.w * 0.45,
                      backgroundColor: alpha(c.accent, 0.12),
                    },
                  ]}
                />
                {spriteSize > 0 ? <PlantSprite angle={0} size={spriteSize} phase={data.phase} /> : null}
              </>
            )}
            {endedLabel ? (
              <View style={[styles.endedBadge, { backgroundColor: alpha(c.bg, 0.85) }]}>
                <Text style={{ ...typo.badge, color: c.accent }}>{endedLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Nombre y genética */}
          <View style={{ marginTop: 12 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...typo.display, color: colors.text }}>
              {data.name}
            </Text>
            <Text numberOfLines={1} style={{ ...typo.label, color: colors.textSoft, marginTop: 2 }}>
              {geneticLine}
            </Text>
          </View>

          {/* Fase y vida */}
          <View style={[styles.stats, { backgroundColor: alpha(c.frame, 0.12) }]}>
            <View style={styles.statCell}>
              <Text style={{ ...typo.badge, color: c.accent, letterSpacing: 1 }}>{PHASE_LABEL[data.phase].toUpperCase()}</Text>
              <Text style={{ ...typo.stat, color: colors.text }}>día {data.dayInPhase}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: alpha(c.frame, 0.35) }]} />
            <View style={styles.statCell}>
              <Text style={{ ...typo.badge, color: c.accent, letterSpacing: 1 }}>VIDA</Text>
              <Text style={{ ...typo.stat, color: colors.text }}>día {data.dayOfLife}</Text>
            </View>
          </View>

          {showHarvest && floweringDays ? (
            <HarvestBar remaining={data.floraRemaining!} total={floweringDays} accent={c.accent} track={alpha(c.frame, 0.2)} />
          ) : null}

          {showCannabinoids ? (
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              {thc ? <Cannabinoid label="THC" value={thc} accent={c.accent} /> : null}
              {cbd ? <Cannabinoid label="CBD" value={cbd} accent={c.accent} /> : null}
            </View>
          ) : null}

          {showTastes ? (
            <View style={styles.chips}>
              {tastes.map((t) => (
                <View key={t} style={[styles.chip, { backgroundColor: alpha(c.accent, 0.14), borderColor: alpha(c.accent, 0.35) }]}>
                  <Text numberOfLines={1} style={{ ...typo.badge, color: c.accent }}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerDot, { backgroundColor: c.frame }]} />
        <Text style={{ ...typo.heading, color: colors.text, letterSpacing: 0.5 }}>weedly</Text>
        <View style={[styles.footerDot, { backgroundColor: c.frame }]} />
      </View>
    </View>
  );
}

function HarvestBar({ remaining, total, accent, track }: { remaining: number; total: number; accent: string; track: string }) {
  const done = Math.max(0, total - remaining);
  const fraction = Math.min(1, done / total);
  return (
    <View style={{ marginTop: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ ...typo.captionStrong, color: colors.text }}>
          {remaining > 0 ? `faltan ~${remaining} ${remaining === 1 ? 'día' : 'días'}` : 'lista para cosechar'}
        </Text>
        <Text style={{ ...typo.caption, color: colors.muted, fontVariant: ['tabular-nums'] }}>
          {done}/{total}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
        <View style={{ width: `${fraction * 100}%`, height: '100%', borderRadius: 3, backgroundColor: accent }} />
      </View>
    </View>
  );
}

function Cannabinoid({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexShrink: 1 }}>
      <Text style={{ ...typo.badge, color: accent, letterSpacing: 1 }}>{label}</Text>
      <Text numberOfLines={1} style={{ ...typo.labelStrong, color: colors.text, flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  story: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    overflow: 'hidden',
    paddingTop: 58,
  },
  glow: { position: 'absolute' },
  frame: {
    width: CROMO_WIDTH,
    height: CROMO_HEIGHT,
    borderRadius: radius.xl + 2,
    padding: FRAME,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  inner: {
    flex: 1,
    borderRadius: radius.lg - 2,
    padding: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  number: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  art: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: radius.sm,
    paddingVertical: 9,
  },
  statCell: { flex: 1, paddingHorizontal: 12, gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    height: 24,
    overflow: 'hidden',
  },
  chip: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 130,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  footerDot: { width: 5, height: 5, borderRadius: 2.5 },
});
