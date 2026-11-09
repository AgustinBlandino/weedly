import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { activeCycle, activeTent, cycleLights, lightDensity } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import { LIGHT_TYPE_LABEL } from '@/types';
import { Body, Card, Empty, H2, IconButton, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmt, lightLabel } from '@/utils';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function IluminacionCicloScreen() {
  const s = useStore();
  const cycle = activeCycle(s);
  const tent = activeTent(s);
  const current = cycle ? cycleLights(s, cycle) : [];
  const orphans = current.filter((l) => !l.light);

  const [initial] = useState(() => current.flatMap((l) => (l.light ? [l.light.id] : [])));
  const [selected, setSelected] = useState<string[]>(initial);

  // Una luminaria creada desde acá (con "Nueva luminaria") vuelve ya marcada.
  const seen = useRef(new Set(s.lights.map((l) => l.id)));
  const lightIds = s.lights.map((l) => l.id).join('|');
  useEffect(() => {
    const fresh = s.lights.filter((l) => !seen.current.has(l.id)).map((l) => l.id);
    if (!fresh.length) return;
    fresh.forEach((id) => seen.current.add(id));
    setSelected((prev) => [...prev, ...fresh.filter((id) => !prev.includes(id))]);
  }, [lightIds]);

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <Title size={28} style={{ flex: 1 }}>
        Iluminación del ciclo
      </Title>
      <IconButton icon="close" label="Cerrar" onPress={close} />
    </View>
  );

  if (!cycle) {
    return (
      <Screen footer={<PrimaryButton label="Volver" onPress={close} style={{ flex: 1 }} />}>
        {header}
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty text="No hay un ciclo activo. Empezá uno desde la Carpa y después elegí su iluminación." />
        </Rise>
      </Screen>
    );
  }

  // Solo se marcan las del catálogo: una luminaria borrada mientras el modal está abierto pasa a ser copia.
  const valid = selected.filter((id) => s.lights.some((l) => l.id === id));
  // Las copias de luminarias borradas siguen siendo parte del ciclo, así que suman a los W/m².
  const preview = lightDensity(s, {
    ...cycle,
    lights: [
      ...orphans.map((l) => ({ label: l.label, watts: l.watts, type: l.type })),
      ...valid.flatMap((id) => {
        const l = s.lights.find((x) => x.id === id);
        return l ? [{ lightId: l.id, label: lightLabel(l), watts: l.watts, type: l.type }] : [];
      }),
    ],
  });
  const total = orphans.length + valid.length;
  const changed = valid.length !== initial.length || valid.some((id) => !initial.includes(id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const newLight = () => router.push('/luminaria/nueva');

  const save = () => {
    // setCycleLights conserva siempre las copias de luminarias borradas.
    if (changed) s.setCycleLights(cycle.id, valid);
    close();
  };

  const catalogEmpty = s.lights.length === 0;

  return (
    <Screen
      footer={
        catalogEmpty ? (
          <PrimaryButton label="Nueva luminaria" icon="add" onPress={newLight} style={{ flex: 1 }} />
        ) : (
          <PrimaryButton label="Guardar iluminación" onPress={save} style={{ flex: 1 }} />
        )
      }
    >
      {header}
      <Muted style={{ marginTop: 4 }}>
        {cycle.name}
        {tent ? ` · ${fmt(tent.widthCm)} × ${fmt(tent.depthCm)} cm` : ''}
      </Muted>

      <Rise delay={40} style={{ marginTop: 18, gap: 10 }}>
        {catalogEmpty ? (
          <Empty text="Todavía no cargaste luminarias. Sumá la que usás con su potencia real y después marcala para este ciclo." />
        ) : (
          <>
            <Card style={{ padding: 14, gap: 2 }}>
              {preview ? (
                <>
                  <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.lime }}>
                    {preview.wPerM2} W/m²
                  </Text>
                  <Muted>
                    {total === 1 ? '1 luminaria' : `${total} luminarias`} · {fmt(preview.totalWatts)} W
                    {preview.ppfdApprox != null ? ` · ≈ ${preview.ppfdApprox} µmol/m²/s` : ''}
                  </Muted>
                  {preview.ppfdApprox != null ? (
                    <Muted>El PPFD es un promedio estimado sobre toda la carpa.</Muted>
                  ) : null}
                </>
              ) : (
                <Muted>{total ? 'No pude calcular los W/m² con las medidas de la carpa.' : 'Marcá las luminarias que usás en este ciclo.'}</Muted>
              )}
            </Card>

            {s.lights.map((l) => {
              const checked = selected.includes(l.id);
              const name = lightLabel(l);
              const detail = [LIGHT_TYPE_LABEL[l.type], `${fmt(l.watts)} W`, l.dimmable ? 'Regulable' : ''].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={l.id}
                  onPress={() => toggle(l.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${name}, ${detail}`}
                  accessibilityState={{ checked }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Card
                    style={{
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1.5,
                      borderColor: checked ? colors.lime : colors.card,
                    }}
                  >
                    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.lime : colors.muted} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>{name}</Text>
                      <Muted>{detail}</Muted>
                    </View>
                  </Card>
                </Pressable>
              );
            })}

            <Pressable
              onPress={newLight}
              accessibilityRole="button"
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.lime} />
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.lime }}>Nueva luminaria</Text>
            </Pressable>
          </>
        )}

        {orphans.length ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            <H2 style={{ fontSize: 17 }}>Ya no están en la Biblioteca</H2>
            {orphans.map((l, i) => {
              const name = [l.type ? LIGHT_TYPE_LABEL[l.type] : '', l.label].filter(Boolean).join(' ');
              return (
                <View
                  key={`${l.label}-${i}`}
                  accessible
                  accessibilityLabel={`${name}, ${fmt(l.watts)} W. Ya no está en tu Biblioteca; queda en el historial del ciclo.`}
                  style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Ionicons name="bulb-outline" size={20} color={colors.muted} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body style={{ color: colors.textSoft }}>{name}</Body>
                    <Muted>{fmt(l.watts)} W</Muted>
                    <Muted style={{ fontSize: 12 }}>Ya no está en tu Biblioteca; queda en el historial del ciclo.</Muted>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </Rise>
    </Screen>
  );
}
