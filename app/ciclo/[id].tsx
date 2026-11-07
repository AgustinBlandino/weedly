import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { coverOf, cyclePlants, summarize } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { PHASE_LABEL } from '@/types';
import { Body, Card, Empty, IconButton, Muted, Rise, Screen, Title } from '@/ui';
import { fmt, fmtDateYear } from '@/utils';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function CicloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const cycle = s.cycles.find((c) => c.id === id && c.status === 'archivado');

  if (!cycle) {
    return (
      <Screen>
        <IconButton icon="arrow-back" label="Volver" onPress={goBack} />
        <Title size={28} style={{ marginTop: 20 }}>No encontré ese ciclo</Title>
        <Body style={{ marginTop: 8, color: colors.textSoft }}>Volvé a la carpa y elegilo en Ciclos anteriores.</Body>
      </Screen>
    );
  }

  const plants = cyclePlants(s, cycle.id);

  return (
    <Screen>
      <IconButton icon="arrow-back" label="Volver" onPress={goBack} />
      <Title size={28} style={{ marginTop: 14 }}>{cycle.name}</Title>
      <Muted style={{ marginTop: 4 }}>
        {fmtDateYear(cycle.startDate)}
        {cycle.endDate ? ` – ${fmtDateYear(cycle.endDate)}` : ''}
      </Muted>

      <Rise delay={40} style={{ marginTop: 18, gap: 10 }}>
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
                accessibilityLabel={`Abrir ${plant.name}`}
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
    </Screen>
  );
}
