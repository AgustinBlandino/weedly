import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { PHASE_LABEL } from '@/types';
import { Body, Card, Empty, Muted, Rise, Screen, Title } from '@/ui';
import { fmt, fmtDate, fmtDateTime, parseDate, toYmd, vpd } from '@/utils';

type Entry =
  | { kind: 'riego'; date: string; id: string; title: string; detail: string }
  | { kind: 'foto'; date: string; id: string; title: string; detail: string; uri: string; plantId: string }
  | { kind: 'clima'; date: string; id: string; title: string; detail: string }
  | { kind: 'fase'; date: string; id: string; title: string; detail: string; plantId: string };

export default function DiarioScreen() {
  const s = useStore();
  const name = (id: string) => s.plants.find((p) => p.id === id)?.name ?? '?';

  const entries: Entry[] = [
    ...s.waterings.map((w) => ({
      kind: 'riego' as const,
      id: w.id,
      date: w.date,
      title: `Riego · ${w.plantIds.map(name).join(', ')}`,
      detail: [w.recipeName ?? 'Solo agua', `${fmt(w.litersPerPlant)} L c/u`, w.ph != null ? `pH ${fmt(w.ph)}` : '', w.ec != null ? `EC ${fmt(w.ec)}` : '']
        .filter(Boolean)
        .join(' · '),
    })),
    ...s.photos.map((p) => ({
      kind: 'foto' as const,
      id: p.id,
      date: p.date,
      title: `Foto · ${name(p.plantId)}${p.tags.length ? ` · ${p.tags.join(', ')}` : ''}`,
      detail: p.description,
      uri: p.uri,
      plantId: p.plantId,
    })),
    ...s.climate.map((c) => ({
      kind: 'clima' as const,
      id: c.id,
      date: c.date,
      title: 'Clima',
      detail: `${fmt(c.tempC)}° · ${Math.round(c.rh)}% · VPD ${fmt(vpd(c.tempC, c.rh), 2)} kPa`,
    })),
    ...s.phases.map((p) => ({
      kind: 'fase' as const,
      id: p.id,
      date: `${p.date}T12:00:00`,
      title: `${name(p.plantId)} pasa a ${PHASE_LABEL[p.phase].toLowerCase()}`,
      detail: fmtDate(p.date),
      plantId: p.plantId,
    })),
  ].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  // Agrupar por día
  const groups: { day: string; items: Entry[] }[] = [];
  entries.forEach((e) => {
    const day = toYmd(parseDate(e.date));
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(e);
    else groups.push({ day, items: [e] });
  });

  const icon: Record<Entry['kind'], React.ComponentProps<typeof Ionicons>['name']> = {
    riego: 'water',
    foto: 'camera',
    clima: 'thermometer',
    fase: 'flag',
  };

  return (
    <Screen>
      <Title size={32}>Diario</Title>
      <Muted style={{ marginTop: 4 }}>Todo lo que pasó en la carpa, del más nuevo al más viejo.</Muted>
      <View style={{ marginTop: 18, gap: 18 }}>
        {groups.length === 0 ? <Empty text="Cuando cargues riegos, fotos o clima, aparecen acá." /> : null}
        {groups.map((g, gi) => (
          <Rise key={g.day} delay={Math.min(gi, 6) * 60} style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 17, color: colors.text }}>{fmtDate(g.day)}</Text>
            {g.items.map((e) => (
              <Pressable
                key={`${e.kind}-${e.id}`}
                disabled={!('plantId' in e)}
                onPress={() => 'plantId' in e && router.push(`/planta/${e.plantId}`)}
              >
                <Card style={{ flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' }}>
                  {e.kind === 'foto' ? (
                    <Image source={{ uri: e.uri }} style={{ width: 52, height: 52, borderRadius: 14 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A302A', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={icon[e.kind]} size={18} color={e.kind === 'riego' ? colors.lime : colors.textSoft} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>{e.title}</Text>
                    {e.detail ? <Body style={{ fontSize: 13, color: colors.textSoft }}>{e.detail}</Body> : null}
                    {e.kind !== 'fase' ? <Muted>{fmtDateTime(e.date)}</Muted> : null}
                  </View>
                </Card>
              </Pressable>
            ))}
          </Rise>
        ))}
      </View>
    </Screen>
  );
}
