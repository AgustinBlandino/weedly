import React from 'react';
import { View } from 'react-native';
import type { PlantSummary } from './selectors';
import { colors } from './theme';
import { Muted } from './ui';
import { fmtWeeks } from './utils';

export function PhaseBar({ s }: { s: PlantSummary }) {
  const remaining = s.floraRemaining ?? 0;
  const total = Math.max(1, s.vegeDays + s.floraDays + remaining);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 3 }}>
        {s.vegeDays > 0 ? <View style={{ flex: s.vegeDays / total, backgroundColor: colors.vege }} /> : null}
        {s.floraDays > 0 ? <View style={{ flex: s.floraDays / total, backgroundColor: colors.flora }} /> : null}
        {remaining > 0 ? <View style={{ flex: remaining / total, backgroundColor: '#2A2F2A' }} /> : null}
        {s.vegeDays + s.floraDays === 0 ? <View style={{ flex: 1, backgroundColor: '#2A2F2A' }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Muted>Vege {s.vegeDays} d</Muted>
        <Muted>Flora {s.floraDays} d</Muted>
        <Muted>
          {s.ended
            ? `${s.dayOfLife} d de vida`
            : s.floraTarget
              ? `Faltan ~${remaining} d (breeder: ${fmtWeeks(s.floraTarget)})`
              : `Día ${s.dayOfLife} desde germinación`}
        </Muted>
      </View>
    </View>
  );
}
