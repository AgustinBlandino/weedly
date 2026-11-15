import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PlantSummary } from './selectors';
import { colors, radius, typo } from './theme';
import { Phase, PHASE_LABEL } from './types';
import { Card, Muted } from './ui';
import { fmtDate, fmtWeeks, parseDate, toYmd } from './utils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Color, fondo e ícono de cada fase: pills de fase, botón de cambio y hoja de confirmación. */
export const PHASE_STYLE: Record<Phase, { fg: string; bg: string; icon: IconName }> = {
  germinacion: { fg: colors.lime, bg: colors.limeBg, icon: 'ellipse-outline' },
  vege: { fg: colors.vege, bg: colors.vegeBg, icon: 'leaf-outline' },
  flora: { fg: colors.flora, bg: colors.floraBg, icon: 'flower-outline' },
  secado: { fg: colors.lime, bg: colors.limeBg, icon: 'cut-outline' },
  curado: { fg: colors.lime, bg: colors.limeBg, icon: 'archive-outline' },
};

export function addDays(ymd: string, days: number): string {
  const d = parseDate(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** Barra de fases con su leyenda y, si corresponde, el botón para pasar a la fase siguiente. */
export function PhaseCard({ s, next, onAdvance }: { s: PlantSummary; next?: Phase; onAdvance?: () => void }) {
  const remaining = s.floraRemaining ?? 0;
  const total = Math.max(1, s.vegeDays + s.floraDays + remaining);
  const right = s.floraRemaining != null ? `Faltan ~${remaining} d` : `${s.dayOfLife} d de vida`;
  const harvest = !s.ended && s.phase === 'flora' && s.floraTarget ? addDays(s.phaseStart, s.floraTarget) : undefined;

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 3 }}>
        {s.vegeDays > 0 ? <View style={{ flex: s.vegeDays / total, backgroundColor: colors.vege }} /> : null}
        {s.floraDays > 0 ? <View style={{ flex: s.floraDays / total, backgroundColor: colors.flora }} /> : null}
        {remaining > 0 ? <View style={{ flex: remaining / total, backgroundColor: '#2A2F2A' }} /> : null}
        {s.vegeDays + s.floraDays === 0 ? <View style={{ flex: 1, backgroundColor: '#2A2F2A' }} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Legend color={colors.vege} label={`Vege ${s.vegeDays} d`} />
          <Legend color={colors.flora} label={`Flora ${s.floraDays} d`} />
        </View>
        <Text style={{ ...typo.labelStrong, color: colors.textSoft }}>{right}</Text>
      </View>

      {harvest && s.floraTarget ? (
        <Muted style={{ marginTop: -4 }}>
          Breeder: {fmtWeeks(s.floraTarget)} de flora · cosecha estimada ~{fmtDate(harvest)}
        </Muted>
      ) : null}

      {next && onAdvance ? <AdvanceButton next={next} onPress={onAdvance} /> : null}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Muted>{label}</Muted>
    </View>
  );
}

function AdvanceButton({ next, onPress }: { next: Phase; onPress: () => void }) {
  const st = PHASE_STYLE[next];
  const label = `Pasar a ${PHASE_LABEL[next].toLowerCase()}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        marginTop: 4,
        minHeight: 50,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: st.fg,
        backgroundColor: st.bg,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Ionicons name={st.icon} size={18} color={st.fg} />
      <Text style={{ flex: 1, ...typo.bodyStrong, color: st.fg }}>{label}</Text>
      <Ionicons name="arrow-forward" size={18} color={st.fg} />
    </Pressable>
  );
}
