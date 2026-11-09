import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FirstStep } from '@/selectors';
import {
  activeCycle,
  activeCyclePhotos,
  activeGenetics,
  activePlants,
  activeTent,
  archivedCycles,
  coverOf,
  cycleLightingHeadline,
  cycleLights,
  emptyPots,
  firstSteps,
  geneticColor,
  lastWatering,
  latestClimate,
  lightDensity,
  needsWater,
  summarize,
  tentHeadlineParts,
  wateringStatus,
} from '@/selectors';
import { useStore } from '@/store';
import { Tent3D } from '@/Tent3D';
import { colors, fonts, radius } from '@/theme';
import { PHASE_LABEL } from '@/types';
import { Body, Card, Empty, H2, IconButton, Muted, PrimaryButton, Rise, SectionHeader, WaterDrop } from '@/ui';
import { daysBetween, fmt, parseDate, relDays, toYmd, today } from '@/utils';

export default function CarpaScreen() {
  const s = useStore();
  const [view, setView] = useState<'3d' | 'lista'>('3d');
  const tent = activeTent(s);
  const cycle = activeCycle(s);
  const list = activePlants(s);
  const empties = emptyPots(s);
  const climate = latestClimate(s);
  // Lectura vieja: más de 24 h desde la última carga.
  const climateStale = !!climate && Date.now() - parseDate(climate.date).getTime() > 24 * 60 * 60 * 1000;
  const climateLabel = climate
    ? `Clima: ${Math.round(climate.tempC)} grados, ${Math.round(climate.rh)} por ciento de humedad, ${spokenAge(climate.date)}`
    : 'Sin lecturas de clima, cargar la primera';
  const vpdLabel = climate
    ? `VPD ${fmt(climate.vpd)} kilopascales, ${spokenAge(climate.date)}`
    : 'Sin VPD, cargar la primera lectura de clima';
  const climateFresh = !!climate && !climateStale;
  const openClimate = () => router.push('/clima');

  const thirsty = list.filter((x) => needsWater(s, x.plant.id));
  const recentPhotos = activeCyclePhotos(s).slice(0, 8);
  const lastClosed = cycle ? undefined : archivedCycles(s)[0]?.cycle;
  const genetics = activeGenetics(s);
  const lighting = cycle ? cycleLightingHeadline(s, cycle) : '';
  const density = cycle ? lightDensity(s, cycle) : undefined;
  // Luminaria del dibujo 3D: apagada si no hay ninguna; cálida si todas las de tipo conocido no son LED.
  const cycleLightList = cycle ? cycleLights(s, cycle) : [];
  const hasLights = cycleLightList.length > 0;
  const lightPill = density
    ? `${density.wPerM2} W/m²`
    : hasLights
      ? `${fmt(cycleLightList.reduce((sum, l) => sum + l.watts, 0))} W`
      : 'Sin iluminación';
  const typedLights = cycleLightList.filter((l) => l.type);
  const tentLighting = {
    on: cycleLightList.length > 0,
    warm: typedLights.length > 0 && typedLights.every((l) => l.type !== 'led'),
  };

  const items = list.map(({ plant, pot }) => ({
    id: plant.id,
    name: plant.name,
    row: pot.row,
    col: pot.col,
    coverUri: coverOf(s, plant)?.uri,
    alert: needsWater(s, plant.id),
    phase: summarize(s, plant).phase,
    color: plant.geneticId ? geneticColor(s, plant.geneticId) : undefined,
    geneticName: s.genetics.find((g) => g.id === plant.geneticId)?.name,
  }));
  const plantIn = (potId: string) => router.push(`/plantar/${potId}`);
  const slots = empties.map((pot) => ({ id: pot.id, row: pot.row, col: pot.col, onPress: () => plantIn(pot.id) }));
  const getStarted = firstSteps(s);
  const stepActions: Record<FirstStep['id'], (() => void) | undefined> = {
    genetica: () => router.push('/genetica/nueva'),
    plantar: empties[0] ? () => plantIn(empties[0].id) : undefined,
    clima: () => router.push('/clima'),
    riego: () => router.push('/riego'),
    foto: () => router.push('/foto'),
  };

  const headline = cycle ? tentHeadlineParts(s) : { title: 'Sin ciclo activo', subtitle: undefined };
  const water = wateringStatus(s);
  const waterColor = !water ? colors.muted : water.overdue ? colors.flora : colors.lime;
  const waterAgo = water ? (water.daysSince === 0 ? 'hoy' : water.daysSince === 1 ? 'ayer' : `hace ${water.daysSince} días`) : '';
  const waterNext = !water
    ? ''
    : water.overdue
      ? 'Toca regar'
      : water.remaining === 1
        ? 'mañana'
        : `en ${water.remaining} días`;
  const waterLabel = water
    ? `Último riego${list.length > 1 ? ` de ${water.plantName}` : ''} ${waterAgo}. ${
        water.overdue ? `Toca regar${thirsty.length > 1 ? `: ${thirsty.map((x) => x.plant.name).join(', ')}` : ''}` : `Próximo riego ${waterNext}`
      }`
    : 'Todavía no cargaste riegos';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View accessible accessibilityRole="header">
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, letterSpacing: -0.5 }}>{headline.title}</Text>
          {headline.subtitle ? (
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.lime, fontVariant: ['tabular-nums'], marginTop: 2 }}>
              {headline.subtitle}
            </Text>
          ) : null}
        </View>

        <Rise delay={60}>
          {!tent ? (
            <View style={{ marginTop: 14 }}>
              <Empty text="No encontré la carpa activa. Tus datos siguen guardados." />
            </View>
          ) : !cycle ? (
            <Card style={{ marginTop: 14, gap: 12 }}>
              <H2>Tu carpa está lista</H2>
              <Body style={{ color: colors.textSoft }}>
                Empezá un ciclo nuevo para volver a plantar. Lo de los ciclos anteriores sigue guardado.
              </Body>
              <PrimaryButton label="Empezar ciclo nuevo" icon="add" onPress={() => router.push('/ciclo/nuevo')} />
              {lastClosed ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/diario', params: { ciclo: lastClosed.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ciclos anteriores, empezando por ${lastClosed.name}`}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="book-outline" size={18} color={colors.lime} />
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.lime }}>Ver ciclos anteriores</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : (
            <View style={{ marginHorizontal: -20, marginTop: 12 }}>
              {/* Pastillas: clima, VPD e iluminación. Si no entran, se achica primero la de iluminación. */}
              <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={openClimate}
                  accessibilityRole="button"
                  accessibilityLabel={climateLabel}
                  accessibilityHint="Abre el clima de la carpa"
                  hitSlop={5}
                  style={({ pressed }) => [pillStyle, { flexShrink: 0, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                >
                  <Ionicons name="thermometer-outline" size={16} color={climateFresh ? colors.lime : colors.muted} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 12,
                      fontVariant: ['tabular-nums'],
                      color: climateFresh ? colors.text : colors.muted,
                    }}
                  >
                    {climate ? `${Math.round(climate.tempC)}° · ${Math.round(climate.rh)}%` : '-- · --'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={openClimate}
                  accessibilityRole="button"
                  accessibilityLabel={vpdLabel}
                  accessibilityHint="Abre el clima de la carpa"
                  hitSlop={5}
                  style={({ pressed }) => [pillStyle, { flexShrink: 0, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                >
                  <Ionicons name="water-outline" size={16} color={climateFresh ? colors.lime : colors.muted} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 12,
                      fontVariant: ['tabular-nums'],
                      color: climateFresh ? colors.text : colors.muted,
                    }}
                  >
                    {climate ? `VPD ${fmt(climate.vpd)}` : 'VPD --'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/ciclo/iluminacion')}
                  accessibilityRole="button"
                  accessibilityLabel={`Iluminación: ${lighting}${density?.ppfdApprox != null ? `, aproximadamente ${density.ppfdApprox} micromoles por metro cuadrado por segundo, promedio estimado` : ''}`}
                  accessibilityHint="Abre la iluminación del ciclo"
                  hitSlop={5}
                  style={({ pressed }) => [pillStyle, { flexShrink: 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                >
                  <Ionicons name={hasLights ? 'bulb' : 'bulb-outline'} size={16} color={hasLights ? colors.lime : colors.muted} />
                  <Text
                    numberOfLines={1}
                    style={{ flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: hasLights ? colors.text : colors.textSoft }}
                  >
                    {lightPill}
                  </Text>
                </Pressable>
              </View>

              <View>
                {/* Selector 3D / Lista: flota arriba a la derecha, sobre el dibujo. */}
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 20,
                    zIndex: 2,
                    flexDirection: 'row',
                    backgroundColor: colors.cardAlt,
                    borderRadius: 12,
                    padding: 3,
                  }}
                >
                  {(['3d', 'lista'] as const).map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setView(v)}
                      accessibilityRole="button"
                      accessibilityLabel={v === '3d' ? 'Vista 3D' : 'Vista en lista'}
                      accessibilityState={{ selected: view === v }}
                      hitSlop={6}
                      style={{
                        width: 36,
                        height: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: view === v ? colors.lime : 'transparent',
                      }}
                    >
                      <Ionicons name={v === '3d' ? 'cube-outline' : 'list'} size={17} color={view === v ? colors.bg : colors.textSoft} />
                    </Pressable>
                  ))}
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
                  height={420}
                  lighting={tentLighting}
                  onPressPlant={(id) => router.push(`/planta/${id}`)}
                />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14 }}>
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
                        accessibilityLabel={`Abrir ${plant.name}${genetic ? `, ${genetic.name}` : ''}`}
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
                        <View style={{ gap: 2 }}>
                          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>{plant.name}</Text>
                          {genetic ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Dot color={geneticColor(s, genetic.id)} />
                              <Muted numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
                                {genetic.name}
                              </Muted>
                            </View>
                          ) : null}
                        </View>
                        <Muted style={{ color: alert ? colors.flora : colors.muted }}>
                          {fmt(pot.liters)} L · {lw ? `riego ${relDays(lw.date)}` : 'sin riegos'}
                        </Muted>
                      </Pressable>
                    );
                  })}
                  {empties.map((pot) => (
                    <Pressable
                      key={pot.id}
                      onPress={() => plantIn(pot.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Plantar en maceta vacía de ${fmt(pot.liters)} litros, ${pot.substrate}`}
                      style={({ pressed }) => ({
                        width: '48%',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: colors.border,
                        padding: 12,
                        gap: 8,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      })}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pot, borderWidth: 3, borderColor: colors.potRim }} />
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textSoft }}>Maceta vacía</Text>
                      <Muted>
                        {fmt(pot.liters)} L · {pot.substrate}
                      </Muted>
                    </Pressable>
                  ))}
                </View>
              )}
              </View>

              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {!list.length ? (
                  <Muted>{empties.length ? 'Tocá una maceta vacía para plantar' : 'Todavía no hay plantas en la carpa'}</Muted>
                ) : (
                  <Pressable
                    onPress={() => router.push('/riego')}
                    accessibilityRole="button"
                    accessibilityLabel={waterLabel}
                    accessibilityHint="Abre Registrar riego"
                    hitSlop={5}
                    style={({ pressed }) => [
                      pillStyle,
                      {
                        alignSelf: 'stretch',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: water?.overdue ? colors.flora : colors.cardAlt,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <WaterDrop fraction={water?.fraction ?? 0} color={waterColor} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: water ? colors.text : colors.textSoft }}>
                      {water ? `Último riego: ${waterAgo}` : 'Todavía no cargaste riegos'}
                    </Text>
                    {water ? (
                      <Text
                        numberOfLines={1}
                        style={{
                          flexShrink: 0,
                          fontFamily: water.overdue ? fonts.bodySemi : fonts.body,
                          fontSize: 12,
                          fontVariant: ['tabular-nums'],
                          color: water.overdue ? colors.flora : colors.muted,
                        }}
                      >
                        {waterNext}
                      </Text>
                    ) : null}
                  </Pressable>
                )}
                {genetics.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {genetics.map((g) => (
                      <Pressable
                        key={g.id}
                        onPress={() => router.push(`/genetica/${g.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${g.name}, ${g.count} ${g.count === 1 ? 'planta' : 'plantas'}`}
                        style={({ pressed }) => ({
                          minHeight: 32,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 10,
                          borderRadius: 16,
                          backgroundColor: colors.card,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        })}
                      >
                        <Dot color={g.color} />
                        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text }}>{g.name}</Text>
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>×{g.count}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </Rise>

        {getStarted.visible ? (
          <Rise delay={140}>
            <Card style={{ marginTop: 14, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <H2>Primeros pasos</H2>
                <IconButton
                  icon="close"
                  label="Ocultar primeros pasos"
                  bg="transparent"
                  color={colors.muted}
                  onPress={() => s.updateSettings({ firstStepsDismissed: true })}
                />
              </View>
              {getStarted.steps.map((step) => {
                const action = stepActions[step.id];
                return (
                  <Pressable
                    key={step.id}
                    onPress={action}
                    disabled={!action}
                    accessibilityRole="button"
                    accessibilityLabel={`${step.label}: ${step.done ? 'hecho' : 'pendiente'}`}
                    accessibilityState={{ disabled: !action }}
                    style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Ionicons
                      name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={step.done ? colors.lime : colors.border}
                    />
                    <Body style={{ flex: 1, color: step.done ? colors.muted : colors.text }}>{step.label}</Body>
                    {action ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
                  </Pressable>
                );
              })}
            </Card>
          </Rise>
        ) : null}

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
                ? 'Sacale una foto a cada planta: la última queda como portada en su ficha y en la lista.'
                : 'Cuando tengas plantas, vas a poder sacarles fotos y ver acá las últimas.'
            }
          />
        )}

        {tent && cycle ? (
          <Pressable
            onPress={() => router.push('/ciclo/cerrar')}
            accessibilityRole="button"
            accessibilityLabel={`Cerrar ciclo ${cycle.name}`}
            style={({ pressed }) => ({
              marginTop: 32,
              minHeight: 52,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.danger,
              backgroundColor: 'rgba(229,115,95,0.12)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons name="stop-circle-outline" size={20} color={colors.danger} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger }}>Cerrar ciclo</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, flexShrink: 1 }}>
              · {cycle.name}
            </Text>
          </Pressable>
        ) : null}
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

/** Pastillas de arriba de la carpa (clima, VPD e iluminación). */
const pillStyle = {
  height: 34,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingHorizontal: 10,
  borderRadius: 12,
  backgroundColor: colors.cardAlt,
};

/** Antigüedad de una lectura para lectores de pantalla: "medida hoy", "medida ayer", "hace 3 días". */
function spokenAge(date: string): string {
  const n = daysBetween(toYmd(parseDate(date)), today());
  if (n <= 0) return 'medida hoy';
  if (n === 1) return 'medida ayer';
  return `hace ${n} días`;
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}
