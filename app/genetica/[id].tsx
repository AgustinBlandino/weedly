import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useStore } from '@/store';
import { Field, IconButton, PrimaryButton, Screen, Title } from '@/ui';
import { parseNum, splitList } from '@/utils';

export default function GeneticaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.genetics.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [breeder, setBreeder] = useState(existing?.breeder ?? '');
  const [type, setType] = useState(existing?.type ?? 'Fem · Foto');
  const [days, setDays] = useState(existing?.floweringDays ? String(existing.floweringDays) : '');
  const [thc, setThc] = useState(existing?.thc ?? '');
  const [cbd, setCbd] = useState(existing?.cbd ?? '');
  const [effects, setEffects] = useState(existing?.effects.join(', ') ?? '');
  const [flavors, setFlavors] = useState(existing?.flavors.join(', ') ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Poné el nombre de la genética.');
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
      seedsAvailable: existing?.seedsAvailable,
    });
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert('Borrar genética', `¿Borrar ${existing.name}? Las plantas que la usan quedan sin genética.`, [
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
  );
}
