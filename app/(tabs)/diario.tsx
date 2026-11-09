import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import {
  activeCycle,
  coverOf,
  cycleEntries,
  cyclePlants,
  defaultDiaryCycleId,
  diaryCycles,
  summarize,
  type DiaryEntry as Entry,
} from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import type { Cycle } from '@/types';
import { PHASE_LABEL } from '@/types';
import { Body, Card, Empty, H2, Muted, Rise, Screen, Title } from '@/ui';
import { fmt, fmtDate, fmtDateTime, fmtDateYear, parseDate, toYmd } from '@/utils';

function cycleDates(c: Cycle): string {
  return c.status === 'activo'
    ? `desde ${fmtDateYear(c.startDate)}`
    : `${fmtDateYear(c.startDate)}${c.endDate ? ` – ${fmtDateYear(c.endDate)}` : ''}`;
}

export default function DiarioScreen() {
  const { ciclo } = useLocalSearchParams<{ ciclo?: string }>();
  const s = useStore();
  const [open, setOpen] = useState(false);
  const cycles = diaryCycles(s);
  const activeId = activeCycle(s)?.id;
  // La pestaña queda montada: la elección vive en estado local y solo vale mientras no cambie el ciclo activo.
  const [selection, setSelection] = useState<{ id: string; activeId?: string }>();

  // El param `ciclo` (desde "Ver ciclos anteriores") se pasa al estado y se limpia,
  // así no queda pegado y volver a tocar el enlace lo vuelve a aplicar.
  useEffect(() => {
    if (!ciclo) return;
    setSelection({ id: ciclo, activeId });
    setOpen(false);
    router.setParams({ ciclo: undefined });
  }, [ciclo]);

  const selectedId = selection && selection.activeId === activeId ? selection.id : undefined;
  const cycleId = selectedId && cycles.some((c) => c.id === selectedId) ? selectedId : defaultDiaryCycleId(s);
  const cycle = cycles.find((c) => c.id === cycleId);
  const isActive = !!cycle && cycle.id === activeId;
  const entries: Entry[] = cycleId ? cycleEntries(s, cycleId) : [];

  const pick = (id: string) => {
    setOpen(false);
    setSelection({ id, activeId });
  };

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

  const subtitle = !cycle
    ? 'Todo lo que pasó en la carpa, del más nuevo al más viejo.'
    : isActive
      ? 'Lo que va del ciclo actual, del más nuevo al más viejo.'
      : 'Lo que pasó en este ciclo, del más nuevo al más viejo.';

  return (
    <Screen>
      <Title size={32}>Diario</Title>
      <Muted style={{ marginTop: 4 }}>{subtitle}</Muted>

      {cycle ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <Pressable
            onPress={() => setOpen((o) => !o)}
            disabled={cycles.length < 2}
            accessibilityRole="button"
            accessibilityLabel={`Ciclo: ${cycle.name}${isActive ? ', actual' : ''}${cycles.length > 1 ? '. Tocá para cambiar de ciclo' : ''}`}
            accessibilityState={{ expanded: cycles.length > 1 ? open : undefined, disabled: cycles.length < 2 }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>
                    {cycle.name}
                  </Text>
                  {isActive ? <CurrentBadge /> : null}
                </View>
                <Muted>{cycleDates(cycle)}</Muted>
              </View>
              {cycles.length > 1 ? (
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              ) : null}
            </Card>
          </Pressable>

          {open && cycles.length > 1 ? (
            <View style={{ backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 4 }}>
              {cycles.map((c) => {
                const selected = c.id === cycle.id;
                const current = c.id === activeId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => pick(c.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}${current ? ', actual' : ''}, ${cycleDates(c)}`}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: radius.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: pressed ? colors.card : 'transparent',
                    })}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text
                          numberOfLines={1}
                          style={{ flexShrink: 1, fontFamily: selected ? fonts.bodySemi : fonts.body, fontSize: 14, color: colors.text }}
                        >
                          {c.name}
                        </Text>
                        {current ? <CurrentBadge /> : null}
                      </View>
                      <Muted>{cycleDates(c)}</Muted>
                    </View>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.lime} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {cycle && !isActive ? <ClosedCyclePlants cycleId={cycle.id} /> : null}

      <View style={{ marginTop: 18, gap: 18 }}>
        {groups.length === 0 ? (
          <Empty
            text={
              cycle && !isActive
                ? 'En este ciclo no quedaron riegos, fotos ni clima cargados.'
                : 'Cuando cargues riegos, fotos o clima, aparecen acá.'
            }
          />
        ) : null}
        {groups.map((g, gi) => (
          <Rise key={`${cycleId}-${g.day}`} delay={Math.min(gi, 6) * 60} style={{ gap: 10 }}>
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

function CurrentBadge() {
  return (
    <Text
      style={{
        backgroundColor: colors.lime,
        color: colors.bg,
        fontFamily: fonts.bodySemi,
        fontSize: 11,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      actual
    </Text>
  );
}

/** Plantas de un ciclo cerrado, en solo lectura: tocar abre la ficha. */
function ClosedCyclePlants({ cycleId }: { cycleId: string }) {
  const s = useStore();
  const plants = cyclePlants(s, cycleId);

  return (
    <Rise key={cycleId} delay={40} style={{ marginTop: 18, gap: 10 }}>
      <H2>Plantas del ciclo</H2>
      {plants.length ? (
        plants.map(({ plant, pot }) => {
          const sum = summarize(s, plant);
          const cover = coverOf(s, plant);
          const genetic = s.genetics.find((g) => g.id === plant.geneticId);
          return (
            <Pressable
              key={plant.id}
              onPress={() => router.push(`/planta/${plant.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${plant.name}${genetic ? `, ${genetic.name}` : ''}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {cover ? (
                  <Image source={{ uri: cover.uri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="leaf" size={20} color={colors.leafLight} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>
                    {plant.name} <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{genetic?.name ?? ''}</Text>
                  </Text>
                  <Muted>
                    {plant.endedAt ? 'Descartada' : PHASE_LABEL[sum.phase]} · {sum.dayOfLife} {sum.dayOfLife === 1 ? 'día' : 'días'} de vida · {fmt(pot.liters)} L
                  </Muted>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            </Pressable>
          );
        })
      ) : (
        <Empty text="Este ciclo se cerró sin plantas." />
      )}
    </Rise>
  );
}
