import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhaseBar } from '@/PhaseBar';
import { coverOf, isPlantActive, lastWatering, photosOf, plantCycle, summarize, wateringsOf } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import { TiltPhoto } from '@/TiltPhoto';
import { Phase, PHASE_LABEL } from '@/types';
import { Body, Card, Chip, Empty, Field, H2, IconButton, Muted, PrimaryButton, Rise, Title } from '@/ui';
import { fmt, fmtDate, fmtDateTime, fmtDateYear, fmtWeeks, parseNum, relDays, today } from '@/utils';

type Tab = 'resumen' | 'riegos' | 'fotos' | 'genetica' | 'cata';
const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'riegos', label: 'Riegos' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'genetica', label: 'Genética' },
  { id: 'cata', label: 'Cata' },
];

const NEXT_PHASE: Partial<Record<Phase, Phase>> = {
  germinacion: 'vege',
  vege: 'flora',
  flora: 'secado',
  secado: 'curado',
};

export default function PlantaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const [tab, setTab] = useState<Tab>('resumen');
  const plant = s.plants.find((p) => p.id === id);

  if (!plant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <IconButton icon="arrow-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Title size={28} style={{ marginTop: 20 }}>No encontré esa planta</Title>
        <Body style={{ marginTop: 8, color: colors.textSoft }}>Puede que ya no exista. Volvé a la carpa y elegí otra.</Body>
      </SafeAreaView>
    );
  }

  const pot = s.pots.find((p) => p.id === plant.potId);
  const genetic = s.genetics.find((g) => g.id === plant.geneticId);
  const sum = summarize(s, plant);
  const cover = coverOf(s, plant);
  const lw = lastWatering(s, plant.id);
  const active = isPlantActive(s, plant);
  const next = active ? NEXT_PHASE[sum.phase] : undefined;
  const cycle = plantCycle(s, plant);
  const notices = [
    cycle?.status === 'archivado' ? `Ciclo cerrado${cycle.endDate ? ` el ${fmtDateYear(cycle.endDate)}` : ''}` : '',
    plant.endedAt ? `Descartada el ${fmtDateYear(plant.endedAt)}` : '',
  ].filter(Boolean);

  const advancePhase = () => {
    if (!next) return;
    Alert.alert(`Pasar a ${PHASE_LABEL[next].toLowerCase()}`, `Se registra hoy (${fmtDate(today())}) como inicio.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => s.changePhase(plant.id, next, today()) },
    ]);
  };

  const discard = () =>
    Alert.alert(
      `Descartar ${plant.name}`,
      'Su historial se conserva y la maceta queda libre para plantar otra. La semilla no vuelve a tu stock.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            s.discardPlant(plant.id, today());
            if (router.canDismiss()) router.dismissTo('/');
            else router.replace('/');
          },
        },
      ],
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton icon="arrow-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <Title size={24}>{plant.name}</Title>
          <IconButton icon="create-outline" label="Editar planta" onPress={() => router.push(`/editar-planta/${plant.id}`)} />
        </View>

        {notices.length ? (
          <View
            accessible
            style={{ marginTop: 14, backgroundColor: colors.floraBg, borderRadius: radius.sm, padding: 12, gap: 2 }}
          >
            {notices.map((notice) => (
              <Text key={notice} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.flora }}>
                {notice}
              </Text>
            ))}
            <Body style={{ fontSize: 13, color: colors.textSoft }}>Su historial queda guardado.</Body>
          </View>
        ) : null}

        <Rise delay={40} style={{ marginTop: 14 }}>
          <TiltPhoto uri={cover?.uri} emptyLabel={active ? `Sacale la primera foto a ${plant.name}` : 'Sin fotos'}>
            <Text
              style={{
                position: 'absolute',
                left: 14,
                top: 14,
                backgroundColor: sum.phase === 'flora' ? colors.floraBg : '#22351F',
                color: sum.phase === 'flora' ? colors.flora : colors.vege,
                fontFamily: fonts.bodySemi,
                fontSize: 12,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {PHASE_LABEL[sum.phase]} · día {sum.dayInPhase}
            </Text>
            <View
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                bottom: 14,
                height: 66,
                borderRadius: radius.md,
                backgroundColor: colors.sage,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
              }}
            >
              <Info label="Genética" value={genetic?.name ?? 'Sin cargar'} />
              <Info label="Maceta" value={pot ? `${pot.liters} L` : '—'} />
              <Info label="Germinó" value={fmtDate(plant.germinationDate)} />
            </View>
          </TiltPhoto>
        </Rise>

        <View style={{ marginTop: 16 }}>
          <PhaseBar s={sum} />
        </View>

        {next ? (
          <Pressable onPress={advancePhase} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>
              Pasar a {PHASE_LABEL[next].toLowerCase()} →
            </Text>
          </Pressable>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((t) => (
            <Chip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} />
          ))}
        </ScrollView>

        <Rise key={tab} style={{ marginTop: 16, gap: 10 }}>
          {tab === 'resumen' ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <H2>Descripción</H2>
                <Pressable onPress={() => router.push(`/editar-planta/${plant.id}`)} hitSlop={10}>
                  <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>Editar</Text>
                </Pressable>
              </View>
              {plant.description ? (
                <Card style={{ padding: 14 }}>
                  <Body style={{ color: colors.textSoft, lineHeight: 20 }}>{plant.description}</Body>
                </Card>
              ) : (
                <Empty text="Agregá una descripción: estructura, olor, cómo viene respondiendo." />
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                <Mini label="Día de vida" value={`${sum.dayOfLife}`} />
                <Mini label="Sustrato" value={pot?.substrate ?? '—'} />
                <Mini label="Último riego" value={lw ? relDays(lw.date) : '—'} />
                <Mini label="Fotos" value={`${photosOf(s, plant.id).length}`} />
              </View>
            </>
          ) : null}

          {tab === 'riegos' ? <RiegosTab plantId={plant.id} readOnly={!active} /> : null}
          {tab === 'fotos' ? <FotosTab plantId={plant.id} readOnly={!active} /> : null}

          {tab === 'genetica' ? (
            genetic ? (
              <>
                <Card style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text }}>{genetic.name}</Text>
                  <Muted>
                    {[genetic.breeder, genetic.type, genetic.floweringDays ? `${fmtWeeks(genetic.floweringDays)} de flora` : '', genetic.thc ? `THC ${genetic.thc}` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </Muted>
                </Card>
                <Muted>Efectos (breeder)</Muted>
                <ChipList items={genetic.effects} empty="Sin efectos cargados" />
                <Muted>Sabores y aromas</Muted>
                <ChipList items={genetic.flavors} empty="Sin sabores cargados" />
                {genetic.notes ? <Body style={{ color: colors.textSoft }}>{genetic.notes}</Body> : null}
                <Pressable onPress={() => router.push(`/genetica/${genetic.id}`)} hitSlop={8}>
                  <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>Editar genética</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Empty text="Esta planta no tiene genética asignada." />
                {!active ? null : (
                  <PrimaryButton label="Asignar genética" onPress={() => router.push(`/editar-planta/${plant.id}`)} />
                )}
              </>
            )
          ) : null}

          {tab === 'cata' ? <CataTab plantId={plant.id} /> : null}
        </Rise>

        {!active ? null : (
          <Pressable
            onPress={discard}
            accessibilityRole="button"
            style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 20 }}
          >
            <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 14 }}>Descartar planta</Text>
          </Pressable>
        )}
      </ScrollView>

      {!active ? null : (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24, flexDirection: 'row', gap: 10 }}>
          <IconButton
            icon="camera-outline"
            label="Agregar foto"
            size={56}
            onPress={() => router.push({ pathname: '/foto', params: { plantId: plant.id } })}
          />
          <PrimaryButton
            label="Regar"
            icon="water"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/riego', params: { plantId: plant.id } })}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sageText }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', backgroundColor: colors.card, borderRadius: 16, padding: 12, gap: 2 }}>
      <Muted>{label}</Muted>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.text }}>{value}</Text>
    </View>
  );
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <Muted style={{ color: colors.textSoft }}>{empty}</Muted>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((x) => (
        <Chip key={x} label={x} />
      ))}
    </View>
  );
}

function RiegosTab({ plantId, readOnly }: { plantId: string; readOnly: boolean }) {
  const s = useStore();
  const list = wateringsOf(s, plantId);
  if (!list.length) return <Empty text="Todavía no hay riegos para esta planta." />;
  return (
    <>
      {list.map((w) => (
        <Pressable
          key={w.id}
          disabled={readOnly}
          onLongPress={() =>
            Alert.alert('Borrar riego', `¿Borrar el riego del ${fmtDateTime(w.date)}? Se borra para todas las plantas de ese riego.`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar', style: 'destructive', onPress: () => s.deleteWatering(w.id) },
            ])
          }
        >
          <Card style={{ padding: 14, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>{w.recipeName ?? 'Solo agua'}</Text>
              <Muted>{fmtDateTime(w.date)}</Muted>
            </View>
            <Muted>
              {[`${fmt(w.litersPerPlant)} L`, w.ph != null ? `pH ${fmt(w.ph)}` : '', w.ec != null ? `EC ${fmt(w.ec)}` : '', w.runoffPh != null ? `runoff pH ${fmt(w.runoffPh)}` : '']
                .filter(Boolean)
                .join(' · ')}
            </Muted>
            {w.items.length ? (
              <Muted style={{ color: colors.textSoft }}>
                {w.items.map((it) => `${it.name} ${fmt(it.mlPerL)} ml/L`).join(' · ')}
              </Muted>
            ) : null}
            {w.notes ? <Body style={{ color: colors.textSoft, fontSize: 13 }}>{w.notes}</Body> : null}
          </Card>
        </Pressable>
      ))}
      {readOnly ? null : <Muted>Mantené apretado un riego para borrarlo.</Muted>}
    </>
  );
}

function FotosTab({ plantId, readOnly }: { plantId: string; readOnly: boolean }) {
  const s = useStore();
  const list = photosOf(s, plantId);
  const plant = s.plants.find((p) => p.id === plantId);
  if (!list.length) return <Empty text={readOnly ? 'Esta planta no tiene fotos.' : 'Sin fotos todavía. Tocá la cámara de abajo.'} />;
  return (
    <View style={{ gap: 14 }}>
      {list.map((p) => (
        <Pressable
          key={p.id}
          disabled={readOnly}
          onPress={() =>
            Alert.alert('Foto', fmtDateTime(p.date), [
              { text: 'Usar como portada', onPress: () => s.setCover(plantId, p.id) },
              { text: 'Borrar', style: 'destructive', onPress: () => s.deletePhoto(p.id) },
              { text: 'Cancelar', style: 'cancel' },
            ])
          }
          style={{ gap: 8 }}
        >
          <Image source={{ uri: p.uri }} style={{ width: '100%', height: 220, borderRadius: 20 }} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Muted>{fmtDateTime(p.date)}</Muted>
            {plant?.coverPhotoId === p.id ? <Chip label="Portada" tone="lime" /> : null}
            {p.tags.map((t) => (
              <Chip key={t} label={t} />
            ))}
          </View>
          {p.description ? <Body style={{ color: colors.textSoft, lineHeight: 20 }}>{p.description}</Body> : null}
        </Pressable>
      ))}
    </View>
  );
}

function CataTab({ plantId }: { plantId: string }) {
  const s = useStore();
  const existing = s.tastings.find((t) => t.plantId === plantId);
  const [flavor, setFlavor] = useState(existing?.flavor ?? '');
  const [aroma, setAroma] = useState(existing?.aroma ?? '');
  const [effect, setEffect] = useState(existing?.effect ?? '');
  const [score, setScore] = useState(existing ? String(existing.score) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(false), [flavor, aroma, effect, score, notes]);

  const save = () => {
    const n = parseNum(score);
    s.upsertTasting({
      plantId,
      flavor,
      aroma,
      effect,
      score: n != null ? Math.max(1, Math.min(10, Math.round(n))) : 0,
      notes,
    });
    setSaved(true);
  };

  return (
    <View style={{ gap: 12 }}>
      <Muted>Tu evaluación después del curado, para comparar con lo que prometía el breeder.</Muted>
      <Field label="Sabor" value={flavor} onChangeText={setFlavor} placeholder="Ej: cítrico, dulce" />
      <Field label="Aroma" value={aroma} onChangeText={setAroma} placeholder="Ej: terroso, especiado" />
      <Field label="Efecto" value={effect} onChangeText={setEffect} placeholder="Ej: relajante, creativo" />
      <Field label="Puntaje (1 a 10)" value={score} onChangeText={setScore} keyboardType="numeric" placeholder="—" />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Lo que quieras recordar" />
      <PrimaryButton label={saved ? 'Guardado' : 'Guardar cata'} icon={saved ? 'checkmark' : undefined} onPress={save} />
    </View>
  );
}
