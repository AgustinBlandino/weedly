import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, View } from 'react-native';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { Chip, Field, IconButton, Muted, PrimaryButton, Screen, Title } from '@/ui';
import { parseNum, splitList } from '@/utils';

const TYPE_PATTERN = /^(Fem|Regular) · (Foto|Auto)$/;

export default function GeneticaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.genetics.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [breeder, setBreeder] = useState(existing?.breeder ?? '');
  const [type, setType] = useState(existing?.type ?? 'Fem · Foto');
  const [seeds, setSeeds] = useState(existing?.seedsAvailable != null ? String(existing.seedsAvailable) : '');
  const [days, setDays] = useState(existing?.floweringDays ? String(existing.floweringDays) : '');
  const [thc, setThc] = useState(existing?.thc ?? '');
  const [cbd, setCbd] = useState(existing?.cbd ?? '');
  const [effects, setEffects] = useState(existing?.effects.join(', ') ?? '');
  const [flavors, setFlavors] = useState(existing?.flavors.join(', ') ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Un tipo escrito a mano no prende ningún chip y no cambia hasta que se toque uno.
  const typeMatch = TYPE_PATTERN.exec(type.trim());
  const pickType = (sex?: 'Fem' | 'Regular', cycle?: 'Foto' | 'Auto') => {
    const nextSex = sex ?? typeMatch?.[1] ?? (/regular/i.test(type) ? 'Regular' : 'Fem');
    const nextCycle = cycle ?? typeMatch?.[2] ?? (/auto/i.test(type) ? 'Auto' : 'Foto');
    setType(`${nextSex} · ${nextCycle}`);
  };

  // Vacío es "sin definir", pero un texto que no es un entero no puede borrar el valor en silencio.
  const seedsNumber = parseNum(seeds);
  const seedsOk = !seeds.trim() || (seedsNumber != null && Number.isInteger(seedsNumber) && seedsNumber >= 0);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Poné el nombre de la genética.');
      return;
    }
    if (!seedsOk) {
      Alert.alert('Revisá las semillas', 'Poné un número entero, 0 o más, o dejalo vacío.');
      return;
    }
    const d = parseNum(days);
    s.upsertGenetic({
      id: existing?.id ?? '',
      name: name.trim(),
      breeder: breeder.trim(),
      type: type.trim(),
      floweringDays: d != null ? Math.round(d) : undefined,
      thc: thc.trim() || undefined,
      cbd: cbd.trim() || undefined,
      effects: splitList(effects),
      flavors: splitList(flavors),
      notes: notes.trim(),
      seedsAvailable: seeds.trim() ? seedsNumber : undefined,
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
          <Field
            label="Semillas disponibles"
            value={seeds}
            onChangeText={setSeeds}
            keyboardType="number-pad"
            placeholder="Sin definir"
          />
          {seedsOk ? null : (
            <Muted accessibilityRole="alert" style={{ color: colors.danger }}>
              Poné un número entero, 0 o más, o dejalo vacío.
            </Muted>
          )}
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Días de flora" value={days} onChangeText={setDays} keyboardType="numeric" style={{ flex: 1 }} />
            <Field label="THC" value={thc} onChangeText={setThc} placeholder="ej: 20%" style={{ flex: 1 }} />
            <Field label="CBD" value={cbd} onChangeText={setCbd} style={{ flex: 1 }} />
          </View>
          <Field label="Efectos (separados por coma)" value={effects} onChangeText={setEffects} placeholder="Relajante, eufórico" />
          <Field label="Sabores y aromas (separados por coma)" value={flavors} onChangeText={setFlavors} placeholder="Cítrico, terroso" />
          <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
