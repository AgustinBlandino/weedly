import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { activePlants, needsWater } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import { Card, Chip, Empty, Field, IconButton, Muted, PrimaryButton, Rise, Screen, Title, Toggle } from '@/ui';
import { fmt, fmtDateTime, parseNum } from '@/utils';

export default function RiegoScreen() {
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const s = useStore();
  const list = activePlants(s);

  const [selected, setSelected] = useState<string[]>(() => {
    if (plantId && list.some((x) => x.plant.id === plantId)) return [plantId];
    const thirsty = list.filter((x) => needsWater(s, x.plant.id)).map((x) => x.plant.id);
    return thirsty;
  });
  const [recipeId, setRecipeId] = useState<string | undefined>(() => s.waterings[0]?.recipeId);
  const [liters, setLiters] = useState<number>(() => s.waterings[0]?.litersPerPlant ?? 1.5);
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [runoff, setRunoff] = useState(false);
  const [runoffPh, setRunoffPh] = useState('');
  const [runoffEc, setRunoffEc] = useState('');
  const [notes, setNotes] = useState('');
  const [now] = useState(() => new Date());

  const recipe = s.recipes.find((r) => r.id === recipeId);
  const total = liters * selected.length;
  const items = useMemo(
    () =>
      (recipe?.items ?? []).map((it) => {
        const f = s.fertilizers.find((x) => x.id === it.fertilizerId);
        return { fertilizerId: it.fertilizerId, name: f ? f.name : 'Producto borrado', mlPerL: it.mlPerL };
      }),
    [recipe, s.fertilizers],
  );

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = () => {
    s.addWatering({
      date: now.toISOString(),
      plantIds: selected,
      litersPerPlant: liters,
      recipeId: recipe?.id,
      recipeName: recipe?.name,
      items,
      ph: parseNum(ph),
      ec: parseNum(ec),
      runoffPh: runoff ? parseNum(runoffPh) : undefined,
      runoffEc: runoff ? parseNum(runoffEc) : undefined,
      notes: notes.trim(),
    });
    router.back();
  };

  if (!list.length) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Registrar riego</Title>
          <IconButton icon="close" label="Cerrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty text="Todavía no hay plantas para regar. Cuando tengas una planta en la carpa, vas a poder registrar sus riegos desde acá." />
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <PrimaryButton
          label={
            selected.length === 0
              ? 'Elegí al menos una planta'
              : `Guardar riego · ${selected.length} ${selected.length === 1 ? 'planta' : 'plantas'}`
          }
          disabled={selected.length === 0}
          onPress={save}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Title size={28}>Registrar riego</Title>
          <Muted>{fmtDateTime(now.toISOString())}</Muted>
        </View>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <Rise delay={40}>
        <Muted style={{ marginTop: 18, marginBottom: 8, fontSize: 13 }}>Plantas</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {list.map(({ plant }) => (
            <Chip key={plant.id} label={plant.name} active={selected.includes(plant.id)} onPress={() => toggle(plant.id)} />
          ))}
          <Chip
            label={selected.length === list.length ? 'Ninguna' : 'Todas'}
            onPress={() => setSelected(selected.length === list.length ? [] : list.map((x) => x.plant.id))}
          />
        </View>
      </Rise>

      <Rise delay={100}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
          <Muted style={{ fontSize: 13 }}>Receta</Muted>
          <Pressable onPress={() => router.push('/receta/nueva')} hitSlop={8}>
            <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>+ Nueva receta</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Solo agua" active={!recipeId} onPress={() => setRecipeId(undefined)} />
          {s.recipes.map((r) => (
            <Chip key={r.id} label={r.name} active={recipeId === r.id} onPress={() => setRecipeId(r.id)} />
          ))}
        </View>
        {items.length ? (
          <Card style={{ marginTop: 10, gap: 10, backgroundColor: colors.cardAlt, borderRadius: radius.md }}>
            {items.map((it) => (
              <View key={it.fertilizerId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>
                  {it.name} <Text style={{ color: colors.muted, fontSize: 12 }}>{fmt(it.mlPerL)} ml/L</Text>
                </Text>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.lime }}>{fmt(it.mlPerL * total)} ml</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </Rise>

      <Rise delay={160}>
        <Muted style={{ marginTop: 18, marginBottom: 8, fontSize: 13 }}>Litros por maceta</Muted>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconButton icon="remove" label="Menos litros" onPress={() => setLiters((l) => Math.max(0.25, l - 0.25))} />
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 30, color: colors.text, minWidth: 84, textAlign: 'center' }}>
              {fmt(liters, 2)} L
            </Text>
            <IconButton icon="add" label="Más litros" onPress={() => setLiters((l) => Math.min(20, l + 0.25))} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Muted>Preparar</Muted>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text }}>{fmt(total, 2)} L</Text>
          </View>
        </View>
      </Rise>

      <Rise delay={220}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Field label="pH de entrada" value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="6,4" style={{ flex: 1 }} />
          <Field label="EC (mS/cm)" value={ec} onChangeText={setEc} keyboardType="decimal-pad" placeholder="opcional" style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <View>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>Medir runoff</Text>
            <Muted>Opcional en tierra</Muted>
          </View>
          <Toggle value={runoff} onChange={setRunoff} label="Medir runoff" />
        </View>
        {runoff ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Field label="pH runoff" value={runoffPh} onChangeText={setRunoffPh} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Field label="EC runoff" value={runoffEc} onChangeText={setRunoffEc} keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
        ) : null}
        <Field label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Opcional" style={{ marginTop: 16 }} />
      </Rise>
    </Screen>
  );
}
