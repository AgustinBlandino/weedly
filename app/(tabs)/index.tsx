import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  activeCycle,
  activePlants,
  activeTent,
  coverOf,
  emptyPots,
  lastWatering,
  latestClimate,
  needsWater,
  summarize,
  tentHeadline,
} from '@/selectors';
import { useStore } from '@/store';
import { Tent3D } from '@/Tent3D';
import { colors, fonts, radius } from '@/theme';
import { PHASE_LABEL } from '@/types';
import { Body, Card, Empty, IconButton, Muted, Rise, SectionHeader, Title } from '@/ui';
import { fmt, relDays } from '@/utils';

export default function CarpaScreen() {
  const s = useStore();
  const [view, setView] = useState<'3d' | 'lista'>('3d');
  const tent = activeTent(s);
  const cycle = activeCycle(s);
  const list = activePlants(s);
  const empties = emptyPots(s);
  const climate = latestClimate(s);

  const thirsty = list.filter((x) => needsWater(s, x.plant.id));
  const recentPhotos = s.photos.slice(0, 8);

  const items = list.map(({ plant, pot }) => ({
    id: plant.id,
    name: plant.name,
    row: pot.row,
    col: pot.col,
    coverUri: coverOf(s, plant)?.uri,
    alert: needsWater(s, plant.id),
  }));
  const slots = empties.map((pot) => ({ id: pot.id, row: pot.row, col: pot.col }));

  const status = thirsty.length
    ? `${thirsty.map((x) => x.plant.name).join(', ')} toca regar`
    : !list.length
      ? 'Todavía no hay plantas en la carpa'
      : s.waterings.length
        ? 'Riegos al día'
        : 'Todavía no cargaste riegos';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Muted style={{ fontSize: 13 }}>
              {tent ? `${tent.name} · ${fmt(tent.heightCm)} cm` : 'Tu carpa'}
            </Muted>
            <Title size={32}>{cycle ? tentHeadline(s) : 'Sin ciclo activo'}</Title>
          </View>
          <IconButton icon="thermometer-outline" label="Cargar clima" onPress={() => router.push('/clima')} />
        </View>

        <Rise delay={60}>
          <Pressable onPress={() => router.push('/clima')} accessibilityRole="button" accessibilityLabel="Clima de la carpa">
            <Card style={{ marginTop: 14, flexDirection: 'row' }}>
              {climate ? (
                <>
                  <Stat value={`${fmt(climate.tempC)}°`} label="Temperatura" />
                  <Stat value={`${Math.round(climate.rh)}%`} label="Humedad" />
                  <Stat value={fmt(climate.vpd)} label={`VPD kPa · ${relDays(climate.date)}`} accent />
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.lime} />
                  <Body style={{ color: colors.textSoft }}>Cargá la primera lectura de temp y humedad</Body>
                </View>
              )}
            </Card>
          </Pressable>
        </Rise>

        <Rise delay={140}>
          {!tent || !cycle ? (
            <View style={{ marginTop: 14 }}>
              <Empty
                text={
                  tent
                    ? 'Esta carpa no tiene un ciclo activo. Tus datos siguen guardados; pronto vas a poder arrancar un ciclo nuevo desde acá.'
                    : 'No encontré la carpa activa. Tus datos siguen guardados.'
                }
              />
            </View>
          ) : (
            <View
              style={{
                marginTop: 14,
                backgroundColor: '#171A17',
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: '#232823',
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 0 }}>
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, color: colors.text }}>Tu carpa</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: 12, padding: 3 }}>
                  {(['3d', 'lista'] as const).map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setView(v)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: view === v }}
                      style={{
                        height: 30,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        justifyContent: 'center',
                        backgroundColor: view === v ? colors.lime : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: view === v ? fonts.bodySemi : fonts.body,
                          fontSize: 12,
                          color: view === v ? colors.bg : colors.textSoft,
                        }}
                      >
                        {v === '3d' ? '3D' : 'Lista'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {view === '3d' ? (
                <Tent3D
                  items={items}
                  emptySlots={slots}
                  rows={tent.rows}
                  cols={tent.cols}
                  widthCm={tent.widthCm}
                  depthCm={tent.depthCm}
                  heightCm={tent.heightCm}
                  onPressPlant={(id) => router.push(`/planta/${id}`)}
                />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 }}>
                  {list.map(({ plant, pot }) => {
                    const sum = summarize(s, plant);
                    const lw = lastWatering(s, plant.id);
                    const alert = needsWater(s, plant.id);
                    const cover = coverOf(s, plant);
                    const genetic = s.genetics.find((g) => g.id === plant.geneticId);
                    return (
                      <Pressable
                        key={plant.id}
                        onPress={() => router.push(`/planta/${plant.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ${plant.name}`}
                        style={({ pressed }) => ({
                          width: '48%',
                          borderRadius: 20,
                          backgroundColor: colors.card,
                          borderWidth: 1.5,
                          borderColor: alert ? colors.flora : colors.card,
                          padding: 12,
                          gap: 8,
                          transform: [{ perspective: 600 }, { rotateX: pressed ? '8deg' : '0deg' }, { scale: pressed ? 0.97 : 1 }],
                        })}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          {cover ? (
                            <Image source={{ uri: cover.uri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                          ) : (
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="leaf" size={20} color={colors.leafLight} />
                            </View>
                          )}
                          <Text style={{ alignSelf: 'flex-start', backgroundColor: colors.floraBg, color: colors.flora, fontFamily: fonts.bodySemi, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' }}>
                            {PHASE_LABEL[sum.phase]} {sum.dayInPhase}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>
                          {plant.name} <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{genetic?.name ?? ''}</Text>
                        </Text>
                        <Muted style={{ color: alert ? colors.flora : colors.muted }}>
                          {fmt(pot.liters)} L · {lw ? `riego ${relDays(lw.date)}` : 'sin riegos'}
                        </Muted>
                      </Pressable>
                    );
                  })}
                  {empties.map((pot) => (
                    <View
                      key={pot.id}
                      accessible
                      accessibilityLabel={`Maceta vacía de ${fmt(pot.liters)} litros, ${pot.substrate}`}
                      style={{
                        width: '48%',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: colors.border,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pot, borderWidth: 3, borderColor: colors.potRim }} />
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textSoft }}>Maceta vacía</Text>
                      <Muted>
                        {fmt(pot.liters)} L · {pot.substrate}
                      </Muted>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12 }}>
                <Muted style={{ color: thirsty.length ? colors.flora : colors.muted }}>{status}</Muted>
                {view === '3d' ? <Muted>Arrastrá para girar</Muted> : null}
              </View>
            </View>
          )}
        </Rise>

        <SectionHeader title="Fotos recientes" action={list.length ? '+ Foto' : undefined} onAction={() => router.push('/foto')} />
        {recentPhotos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {recentPhotos.map((p) => {
              const plant = s.plants.find((x) => x.id === p.plantId);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/planta/${p.plantId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Foto de ${plant?.name ?? 'planta'}`}
                  style={({ pressed }) => ({
                    transform: [{ perspective: 700 }, { rotateY: pressed ? '-12deg' : '0deg' }, { rotateX: pressed ? '8deg' : '0deg' }],
                  })}
                >
                  <Image source={{ uri: p.uri }} style={{ width: 108, height: 132, borderRadius: 18 }} />
                  <Text style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.bg, color: colors.text, fontFamily: fonts.bodySemi, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>
                    {plant?.name} · {relDays(p.date)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Empty
            text={
              list.length
                ? 'Sacale una foto a cada planta: la última queda como portada en la carpa 3D.'
                : 'Cuando tengas plantas, vas a poder sacarles fotos y ver acá las últimas.'
            }
          />
        )}
      </ScrollView>

      {list.length ? (
        <Pressable
          onPress={() => router.push('/riego')}
          accessibilityRole="button"
          accessibilityLabel="Registrar riego"
          style={({ pressed }) => ({
            position: 'absolute',
            right: 20,
            bottom: 20,
            width: 60,
            height: 60,
            borderRadius: 20,
            backgroundColor: colors.lime,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Ionicons name="water" size={26} color={colors.bg} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 26, color: accent ? colors.lime : colors.text }}>{value}</Text>
      <Muted numberOfLines={1}>{label}</Muted>
    </View>
  );
}
