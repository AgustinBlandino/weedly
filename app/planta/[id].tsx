import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhaseCard, PHASE_STYLE } from '@/PhaseBar';
import { PhaseChangeSheet } from '@/PhaseChangeSheet';
import { coverOf, feedSummary, fmtDose, isPlantActive, lastWatering, phaseSiblings, photosOf, plantCycle, summarize, wateringsOf } from '@/selectors';
import { useStore } from '@/store';
import { colors, radius, typo } from '@/theme';
import { TiltPhoto } from '@/TiltPhoto';
import { Phase, PHASE_LABEL } from '@/types';
import { Body, Card, Chip, Empty, Field, H2, IconButton, Label, Muted, PrimaryButton, Rise, Title } from '@/ui';
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
  const [phaseSheet, setPhaseSheet] = useState(false);
  const plant = s.plants.find((p) => p.id === id);

  if (!plant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <IconButton icon="arrow-back" label="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Title style={{ marginTop: 20 }}>No encontré esa planta</Title>
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

  // Cata recién tiene sentido con la planta cosechada (o si ya se cargó una).
  const showCata =
    !active || sum.phase === 'secado' || sum.phase === 'curado' || s.tastings.some((t) => t.plantId === plant.id);
  const tabs = TABS.filter((t) => t.id !== 'cata' || showCata);
  const currentTab: Tab = tabs.some((t) => t.id === tab) ? tab : 'resumen';

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
          <Title numberOfLines={1} style={{ flexShrink: 1, textAlign: 'center', marginHorizontal: 8 }}>
            {plant.name}
          </Title>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="share-outline" label="Compartir cromo" onPress={() => router.push(`/cromo/${plant.id}`)} />
            <IconButton icon="create-outline" label="Editar planta" onPress={() => router.push(`/editar-planta/${plant.id}`)} />
          </View>
        </View>

        {notices.length ? (
          <View
            accessible
            style={{ marginTop: 14, backgroundColor: colors.floraBg, borderRadius: radius.sm, padding: 12, gap: 2 }}
          >
            {notices.map((notice) => (
              <Text key={notice} style={{ ...typo.bodyStrong, color: colors.flora }}>
                {notice}
              </Text>
            ))}
            <Label style={{ color: colors.textSoft }}>Su historial queda guardado.</Label>
          </View>
        ) : null}

        <Rise delay={40} style={{ marginTop: 14 }}>
          <TiltPhoto uri={cover?.uri} emptyLabel={active ? `Sacale la primera foto a ${plant.name}` : 'Sin fotos'}>
            <Text
              style={{
                position: 'absolute',
                left: 14,
                top: 14,
                backgroundColor: PHASE_STYLE[sum.phase].bg,
                color: PHASE_STYLE[sum.phase].fg,
                ...typo.captionStrong,
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
          <PhaseCard s={sum} next={next} onAdvance={next ? () => setPhaseSheet(true) : undefined} />
        </View>

        <View accessibilityRole="tablist" style={{ marginTop: 24 }}>
          <Segmented tabs={tabs} value={currentTab} onChange={setTab} />
        </View>

        <Rise key={currentTab} style={{ marginTop: 18, gap: 12 }}>
          {currentTab === 'resumen' ? (
            <>
              <Card style={{ padding: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
                <Stat label="Día de vida" value={`${sum.dayOfLife}`} edge="right-bottom" />
                <Stat label="Último riego" value={lw ? relDays(lw.date) : '—'} edge="bottom" />
                <Stat label="Fotos" value={`${photosOf(s, plant.id).length}`} edge="right" />
                <Stat label="Sustrato" value={pot?.substrate || '—'} />
              </Card>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <H2>Descripción</H2>
                <Pressable
                  onPress={() => router.push(`/editar-planta/${plant.id}`)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Editar descripción"
                >
                  <Text style={{ color: colors.lime, ...typo.bodyStrong }}>Editar</Text>
                </Pressable>
              </View>
              {plant.description ? (
                <Card>
                  <Body style={{ color: colors.textSoft, lineHeight: 21 }}>{plant.description}</Body>
                </Card>
              ) : (
                <Empty text="Agregá una descripción: estructura, olor, cómo viene respondiendo." />
              )}
            </>
          ) : null}

          {currentTab === 'riegos' ? <RiegosTab plantId={plant.id} readOnly={!active} /> : null}
          {currentTab === 'fotos' ? <FotosTab plantId={plant.id} readOnly={!active} /> : null}

          {currentTab === 'genetica' ? (
            genetic ? (
              <>
                <Card style={{ gap: 4 }}>
                  <Text style={{ ...typo.bodyStrong, color: colors.text }}>{genetic.name}</Text>
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
                  <Text style={{ color: colors.lime, ...typo.labelStrong }}>Editar genética</Text>
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

          {currentTab === 'cata' ? <CataTab plantId={plant.id} /> : null}
        </Rise>

        {!active ? null : (
          <Pressable
            onPress={discard}
            accessibilityRole="button"
            style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 20 }}
          >
            <Text style={{ color: colors.danger, ...typo.bodyStrong }}>Descartar planta</Text>
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

      {next ? (
        <PhaseChangeSheet
          visible={phaseSheet}
          plant={plant}
          sum={sum}
          next={next}
          siblings={phaseSiblings(s, plant)}
          onClose={() => setPhaseSheet(false)}
          onConfirm={(date, ids) => {
            ids.forEach((pid) => s.changePhase(pid, next, date));
            setPhaseSheet(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Segmented({ tabs, value, onChange }: { tabs: { id: Tab; label: string }[]; value: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.sm, padding: 4, gap: 4 }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radius.sm - 4,
              backgroundColor: on ? colors.lime : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{ ...typo.labelStrong, color: on ? colors.bg : colors.textSoft }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ ...typo.caption, color: colors.sageText }}>{label}</Text>
      <Text numberOfLines={1} style={{ ...typo.bodyStrong, color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

/** Celda de la grilla 2×2 del Resumen; `edge` dibuja la línea divisoria hacia la celda vecina. */
function Stat({ label, value, edge }: { label: string; value: string; edge?: 'right' | 'bottom' | 'right-bottom' }) {
  const line = { borderColor: colors.border };
  return (
    <View
      style={[
        { width: '50%', paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
        edge?.includes('right') ? { ...line, borderRightWidth: StyleSheet.hairlineWidth } : null,
        edge?.includes('bottom') ? { ...line, borderBottomWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
      <Muted>{label}</Muted>
      <Text numberOfLines={1} style={{ ...typo.stat, color: colors.text }}>
        {value}
      </Text>
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
              <Text style={{ ...typo.bodyStrong, color: colors.text }}>{w.items.length ? (w.recipeName ?? 'Con fertilizante') : feedSummary(w)}</Text>
              <Muted>{fmtDateTime(w.date)}</Muted>
            </View>
            <Muted>
              {[`${fmt(w.litersPerPlant)} L`, w.ph != null ? `pH ${fmt(w.ph)}` : '', w.ec != null ? `EC ${fmt(w.ec)}` : '', w.runoffPh != null ? `runoff pH ${fmt(w.runoffPh)}` : '']
                .filter(Boolean)
                .join(' · ')}
            </Muted>
            {w.items.length ? (
              <Muted style={{ color: colors.textSoft }}>
                {w.items.map(fmtDose).join(' · ')}
              </Muted>
            ) : null}
            {w.notes ? <Label style={{ color: colors.textSoft }}>{w.notes}</Label> : null}
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
