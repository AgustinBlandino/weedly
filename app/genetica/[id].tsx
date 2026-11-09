import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, View } from 'react-native';
import { EFFECT_OPTIONS, FLAVOR_OPTIONS, mergeOptions, optionKey } from '@/presets';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { Chip, Field, H2, IconButton, Muted, PrimaryButton, Screen, Title } from '@/ui';
import { fmt, parseNum } from '@/utils';

const TYPE_PATTERN = /^(Fem|Regular) · (Foto|Auto)$/;
const WEEKS_MAX = 30;

export default function GeneticaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.genetics.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [breeder, setBreeder] = useState(existing?.breeder ?? '');
  const [type, setType] = useState(existing?.type ?? 'Fem · Foto');
  // La flora se carga en semanas y se guarda en días. Si no se toca el campo, se conserva el valor guardado
  // tal cual (por ejemplo 60 días no se redondea a 8,6 × 7).
  const [initialWeeks] = useState(existing?.floweringDays ? fmt(existing.floweringDays / 7) : '');
  const [weeks, setWeeks] = useState(initialWeeks);
  const [thc, setThc] = useState(existing?.thc ?? '');
  const [cbd, setCbd] = useState(existing?.cbd ?? '');
  const [effects, setEffects] = useState<string[]>(existing?.effects ?? []);
  const [flavors, setFlavors] = useState<string[]>(existing?.flavors ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Las opciones suman lo que ya se cargó en cualquier genética, así nada de lo guardado queda escondido.
  const [effectOptions] = useState(() => mergeOptions(EFFECT_OPTIONS, ...s.genetics.map((g) => g.effects)));
  const [flavorOptions] = useState(() => mergeOptions(FLAVOR_OPTIONS, ...s.genetics.map((g) => g.flavors)));

  // Un tipo escrito a mano no prende ningún chip y no cambia hasta que se toque uno.
  const typeMatch = TYPE_PATTERN.exec(type.trim());
  const pickType = (sex?: 'Fem' | 'Regular', cycle?: 'Foto' | 'Auto') => {
    const nextSex = sex ?? typeMatch?.[1] ?? (/regular/i.test(type) ? 'Regular' : 'Fem');
    const nextCycle = cycle ?? typeMatch?.[2] ?? (/auto/i.test(type) ? 'Auto' : 'Foto');
    setType(`${nextSex} · ${nextCycle}`);
  };

  // Vacío es "sin definir", pero un texto inválido no puede borrar el valor en silencio.
  const weeksNumber = parseNum(weeks);
  const weeksOk = !weeks.trim() || (weeksNumber != null && weeksNumber > 0 && weeksNumber <= WEEKS_MAX);
  const floweringDays = !weeksOk
    ? undefined
    : weeks === initialWeeks
      ? existing?.floweringDays
      : weeksNumber != null
        ? Math.round(weeksNumber * 7)
        : undefined;

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Poné el nombre de la genética.');
      return;
    }
    if (!weeksOk) {
      Alert.alert('Revisá las semanas de floración', `Poné un número mayor a 0 y hasta ${WEEKS_MAX}, o dejalo vacío.`);
      return;
    }
    s.upsertGenetic({
      id: existing?.id ?? '',
      name: name.trim(),
      breeder: breeder.trim(),
      type: type.trim(),
      floweringDays,
      thc: thc.trim() || undefined,
      cbd: cbd.trim() || undefined,
      effects,
      flavors,
      notes: notes.trim(),
    });
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert('Borrar genética', `¿Borrar ${existing.name}? Las plantas que la usan quedan sin genética, también las de ciclos cerrados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          s.deleteGenetic(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        footer={
          <>
            {existing ? <IconButton icon="trash-outline" label="Borrar genética" size={56} onPress={remove} /> : null}
            <PrimaryButton label="Guardar genética" onPress={save} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>{existing ? existing.name : 'Nueva genética'}</Title>
          <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
        </View>
        <View style={{ gap: 14, marginTop: 18 }}>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Field label="Banco / breeder" value={breeder} onChangeText={setBreeder} />
          <View style={{ gap: 8 }}>
            <Muted style={{ fontSize: 13 }}>Tipo de semilla</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="Fem" active={typeMatch?.[1] === 'Fem'} onPress={() => pickType('Fem')} />
              <Chip label="Regular" active={typeMatch?.[1] === 'Regular'} onPress={() => pickType('Regular')} />
              <Chip label="Foto" active={typeMatch?.[2] === 'Foto'} onPress={() => pickType(undefined, 'Foto')} />
              <Chip label="Auto" active={typeMatch?.[2] === 'Auto'} onPress={() => pickType(undefined, 'Auto')} />
            </View>
          </View>
          <Field label="Tipo" value={type} onChangeText={setType} placeholder="Fem · Foto" />

          <Section title="Tiempo">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field
                label="Semanas de floración"
                value={weeks}
                onChangeText={setWeeks}
                keyboardType="decimal-pad"
                placeholder="ej: 9"
                style={{ flex: 1 }}
              />
              <Field
                label="Días de floración"
                value={floweringDays != null ? String(floweringDays) : '—'}
                editable={false}
                accessibilityHint="Se calcula solo a partir de las semanas"
                style={{ flex: 1, opacity: 0.6 }}
              />
            </View>
            {weeksOk ? (
              <Muted>Los días se calculan solos: semanas × 7.</Muted>
            ) : (
              <Muted accessibilityRole="alert" style={{ color: colors.danger }}>
                Poné un número mayor a 0 y hasta {WEEKS_MAX}, o dejalo vacío.
              </Muted>
            )}
          </Section>

          <Section title="Composición">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="THC" value={thc} onChangeText={setThc} placeholder="ej: 20%" style={{ flex: 1 }} />
              <Field label="CBD" value={cbd} onChangeText={setCbd} placeholder="ej: 1%" style={{ flex: 1 }} />
            </View>
          </Section>

          <Section title="Efectos">
            <MultiSelect options={effectOptions} selected={effects} onChange={setEffects} addLabel="Agregar otro efecto" />
          </Section>

          <Section title="Sabores y aromas">
            <MultiSelect options={flavorOptions} selected={flavors} onChange={setFlavors} addLabel="Agregar otro sabor o aroma" />
          </Section>

          <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <H2 style={{ fontSize: 17 }}>{title}</H2>
      {children}
    </View>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
  addLabel,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
}) {
  const [draft, setDraft] = useState('');
  // Lo agregado a mano y lo guardado que no esté en la lista también se muestra como chip.
  const all = mergeOptions(options, selected);
  const selectedKeys = new Set(selected.map(optionKey));

  const toggle = (value: string) => {
    const key = optionKey(value);
    onChange(selectedKeys.has(key) ? selected.filter((v) => optionKey(v) !== key) : [...selected, value]);
  };

  const add = () => {
    const value = draft.trim().replace(/\s+/g, ' ');
    setDraft('');
    if (!value) return;
    const match = all.find((o) => optionKey(o) === optionKey(value));
    if (selectedKeys.has(optionKey(value))) return;
    onChange([...selected, match ?? value]);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {all.map((o) => (
          <Chip key={optionKey(o)} label={o} active={selectedKeys.has(optionKey(o))} onPress={() => toggle(o)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <Field
          label={addLabel}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          submitBehavior="submit"
          maxLength={30}
          style={{ flex: 1 }}
        />
        <IconButton icon="add" label={addLabel} size={48} onPress={add} />
      </View>
    </View>
  );
}
