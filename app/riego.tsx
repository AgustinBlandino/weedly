import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { activePlants, lastFeedMix, needsWater } from '@/selectors';
import { useStore } from '@/store';
import { colors, radius, typo } from '@/theme';
import type { Fertilizer, WateringItem } from '@/types';
import { Card, Chip, Empty, Field, IconButton, Label, Muted, PrimaryButton, Rise, Screen, Title, Toggle } from '@/ui';
import { fmt, fmtDate, fmtDateTime, parseNum } from '@/utils';

const DOSE_STEP = 0.5;
const DOSE_MAX = 50;

export default function RiegoScreen() {
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const s = useStore();
  const list = activePlants(s);

  const [selected, setSelected] = useState<string[]>(() => {
    if (plantId && list.some((x) => x.plant.id === plantId)) return [plantId];
    const thirsty = list.filter((x) => needsWater(s, x.plant.id)).map((x) => x.plant.id);
    return thirsty;
  });
  const [liters, setLiters] = useState<number>(() => s.waterings[0]?.litersPerPlant ?? 1.5);
  // Por defecto solo agua; al pasar a "Con fertilizante" se precarga la mezcla del último riego con fertilizante.
  const [feed, setFeed] = useState(false);
  const [mix, setMix] = useState<WateringItem[] | null>(null);
  const [lastMix] = useState(() => lastFeedMix(s));
  const [edited, setEdited] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [runoff, setRunoff] = useState(false);
  const [runoffPh, setRunoffPh] = useState('');
  const [runoffEc, setRunoffEc] = useState('');
  const [notes, setNotes] = useState('');
  const [now] = useState(() => new Date());

  const total = liters * selected.length;
  // Nombre y unidad salen del estante actual; si el producto se borró, se usa lo guardado en el riego.
  const items = useMemo<WateringItem[]>(
    () =>
      (mix ?? []).map((it) => {
        const f = s.fertilizers.find((x) => x.id === it.fertilizerId);
        return {
          fertilizerId: it.fertilizerId,
          name: f ? f.name : it.name,
          mlPerL: it.mlPerL,
          unit: f ? (f.unit ?? 'ml') : (it.unit ?? 'ml'),
        };
      }),
    [mix, s.fertilizers],
  );
  const available = s.fertilizers.filter((f) => !items.some((it) => it.fertilizerId === f.id));

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const chooseFeed = (on: boolean) => {
    setFeed(on);
    if (on && mix == null) {
      // No precargar productos que ya no están en el estante.
      const prefill = lastMix.items
        .filter((it) => s.fertilizers.some((f) => f.id === it.fertilizerId))
        .map((it) => ({ ...it }));
      setMix(prefill);
      setPicking(!prefill.length);
    }
  };

  const setDose = (fertilizerId: string, dose: number) => {
    setEdited(true);
    setMix((cur) =>
      dose <= 0
        ? (cur ?? []).filter((it) => it.fertilizerId !== fertilizerId)
        : (cur ?? []).map((it) => (it.fertilizerId === fertilizerId ? { ...it, mlPerL: dose } : it)),
    );
  };

  const addProduct = (f: Fertilizer) => {
    setEdited(true);
    setMix((cur) => [...(cur ?? []), { fertilizerId: f.id, name: f.name, mlPerL: 1, unit: f.unit ?? 'ml' }]);
    setPicking(false);
  };

  // Al ir al catálogo o a cargar un producto propio, se recuerda el estante. Al volver, si se sumó
  // un solo producto entra directo a la mezcla; si se sumaron varios, quedan a mano en "Agregar producto".
  const shelfBefore = useRef<Set<string> | null>(null);
  const goAddToShelf = (path: '/catalogo' | '/fertilizante/nuevo') => {
    shelfBefore.current = new Set(s.fertilizers.map((f) => f.id));
    router.push(path);
  };
  // Se evalúa al volver a la pantalla (no en cada cambio del estante), así catálogo + producto
  // propio en el mismo viaje se resuelven juntos. Un producto propio siempre entra a la mezcla:
  // se cargó para este riego. Del catálogo entra solo si fue uno; si fueron varios, quedan como chips.
  useFocusEffect(
    useCallback(() => {
      const before = shelfBefore.current;
      if (!before) return;
      shelfBefore.current = null;
      const fresh = useStore.getState().fertilizers.filter((f) => !before.has(f.id));
      if (!fresh.length) return;
      const custom = fresh.filter((f) => !f.catalogId);
      const toMix = fresh.length === 1 ? fresh : custom;
      toMix.forEach(addProduct);
      if (toMix.length < fresh.length) setPicking(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const save = () => {
    s.addWatering({
      date: now.toISOString(),
      plantIds: selected,
      litersPerPlant: liters,
      items: feed ? items.filter((it) => it.mlPerL > 0) : [],
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
          <Title>Registrar riego</Title>
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
          <Title>Registrar riego</Title>
          <Muted>{fmtDateTime(now.toISOString())}</Muted>
        </View>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <Rise delay={40}>
        <Label style={{ marginTop: 18, marginBottom: 8 }}>Plantas</Label>
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
        <Label style={{ marginTop: 18, marginBottom: 8 }}>Litros por maceta</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconButton icon="remove" label="Menos litros" onPress={() => setLiters((l) => Math.max(0.25, l - 0.25))} />
            <Text style={{ ...typo.hero, color: colors.text, minWidth: 84, textAlign: 'center' }}>
              {fmt(liters, 2)} L
            </Text>
            <IconButton icon="add" label="Más litros" onPress={() => setLiters((l) => Math.min(20, l + 0.25))} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Muted>Preparar</Muted>
            <Text style={{ ...typo.stat, color: colors.text }}>{fmt(total, 2)} L</Text>
          </View>
        </View>
      </Rise>

      <Rise delay={160}>
        <Label style={{ marginTop: 18, marginBottom: 8 }}>Mezcla</Label>
        <Segmented
          options={[
            { id: 'agua', label: 'Solo agua' },
            { id: 'fert', label: 'Con fertilizante' },
          ]}
          value={feed ? 'fert' : 'agua'}
          onChange={(id) => chooseFeed(id === 'fert')}
        />

        {feed ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            {lastMix.date && lastMix.items.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Muted style={{ color: colors.textSoft }}>
                  {edited ? 'Basada en el último riego' : 'Mezcla del último riego'} · {fmtDate(lastMix.date)}
                </Muted>
                {edited ? null : (
                  <View style={{ backgroundColor: colors.limeBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ ...typo.badge, color: colors.lime }}>Recomendado</Text>
                  </View>
                )}
              </View>
            ) : null}

            {items.map((it) => (
              <MixRow
                key={it.fertilizerId}
                item={it}
                totalLiters={total}
                onChange={(dose) => setDose(it.fertilizerId, dose)}
              />
            ))}

            {s.fertilizers.length === 0 ? (
              <Card style={{ gap: 8, backgroundColor: colors.cardAlt, borderRadius: radius.md }}>
                <Muted style={{ color: colors.textSoft }}>Tu estante está vacío. Sumá los productos que usás para armar la mezcla.</Muted>
                <ShelfActions onCatalog={() => goAddToShelf('/catalogo')} onCustom={() => goAddToShelf('/fertilizante/nuevo')} />
              </Card>
            ) : picking ? (
              <Card style={{ gap: 10, backgroundColor: colors.cardAlt, borderRadius: radius.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...typo.bodyStrong, color: colors.text }}>Agregar producto</Text>
                  {items.length ? (
                    <Pressable onPress={() => setPicking(false)} accessibilityRole="button" hitSlop={10}>
                      <Text style={{ ...typo.labelStrong, color: colors.muted }}>Cerrar</Text>
                    </Pressable>
                  ) : null}
                </View>
                {available.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {available.map((f) => (
                      <Chip key={f.id} label={f.name} onPress={() => addProduct(f)} />
                    ))}
                  </View>
                ) : (
                  <Muted>Ya están todos los productos de tu estante en la mezcla.</Muted>
                )}
                <ShelfActions onCatalog={() => goAddToShelf('/catalogo')} onCustom={() => goAddToShelf('/fertilizante/nuevo')} />
              </Card>
            ) : (
              <Pressable
                onPress={() => setPicking(true)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  minHeight: 48,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="add" size={18} color={colors.lime} />
                <Text style={{ ...typo.labelStrong, color: colors.lime }}>Agregar producto</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </Rise>

      <Rise delay={220}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Field label="pH de entrada" value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="6,4" style={{ flex: 1 }} />
          <Field label="EC (mS/cm)" value={ec} onChangeText={setEc} keyboardType="decimal-pad" placeholder="opcional" style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <View>
            <Text style={{ ...typo.bodyStrong, color: colors.text }}>Medir runoff</Text>
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.sm, padding: 4, gap: 4 }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius.sm - 4,
              backgroundColor: on ? colors.lime : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...typo.labelStrong, color: on ? colors.bg : colors.textSoft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dos caminos para sumar al estante sin salir del riego: catálogo o producto propio. */
function ShelfActions({ onCatalog, onCustom }: { onCatalog: () => void; onCustom: () => void }) {
  const link = (label: string, icon: 'book-outline' | 'create-outline', onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={16} color={colors.lime} />
      <Text style={{ ...typo.labelStrong, color: colors.lime }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
      {link('Del catálogo', 'book-outline', onCatalog)}
      {link('Cargar uno propio', 'create-outline', onCustom)}
    </View>
  );
}

/** Un producto de la mezcla: dosis por litro con stepper (o tipeada) y el total a preparar. */
function MixRow({
  item,
  totalLiters,
  onChange,
}: {
  item: WateringItem;
  totalLiters: number;
  onChange: (dose: number) => void;
}) {
  const unit = item.unit ?? 'ml';
  const dose = item.mlPerL;
  // Texto mientras se tipea; null cuando no hay foco y se muestra la dosis formateada.
  const [draft, setDraft] = useState<string | null>(null);
  const step = (dir: 1 | -1) => {
    setDraft(null);
    onChange(Math.min(DOSE_MAX, Math.max(0, Math.round((dose + dir * DOSE_STEP) * 100) / 100)));
  };

  return (
    <Card style={{ gap: 10, padding: 14, backgroundColor: colors.cardAlt, borderRadius: radius.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text style={{ ...typo.bodyStrong, color: colors.text, flex: 1 }} numberOfLines={2}>
          {item.name}
        </Text>
        <Text
          accessibilityLabel={`Preparar ${fmt(dose * totalLiters, 2)} ${unit}`}
          style={{ ...typo.stat, color: colors.lime }}
        >
          {fmt(dose * totalLiters, 2)} {unit}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconButton icon="remove" label={`Menos ${item.name}`} onPress={() => step(-1)} />
        <TextInput
          value={draft ?? fmt(dose, 2)}
          onFocus={() => setDraft(fmt(dose, 2))}
          onChangeText={(t) => {
            setDraft(t);
            const n = parseNum(t);
            if (n != null && n > 0) onChange(Math.min(DOSE_MAX, n));
          }}
          onEndEditing={() => {
            const n = parseNum(draft ?? '');
            setDraft(null);
            if (n != null && n <= 0) onChange(0);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={`Dosis de ${item.name} en ${unit} por litro`}
          style={{
            ...typo.stat,
            lineHeight: undefined,
            color: colors.text,
            minWidth: 60,
            height: 44,
            paddingHorizontal: 8,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            textAlign: 'center',
          }}
        />
        <IconButton icon="add" label={`Más ${item.name}`} onPress={() => step(1)} />
        <Muted style={{ flex: 1 }}>{unit}/L</Muted>
        <IconButton icon="close" label={`Quitar ${item.name}`} bg={colors.card} color={colors.muted} onPress={() => onChange(0)} />
      </View>
    </Card>
  );
}
