import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useStore } from '@/store';
import { Field, IconButton, PrimaryButton, Screen, Title } from '@/ui';

export default function FertilizanteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.fertilizers.find((f) => f.id === id);
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState(existing?.kind ?? '');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Poné el nombre del producto.');
      return;
    }
    s.upsertFertilizer({ id: existing?.id ?? '', brand: brand.trim(), name: name.trim(), kind: kind.trim() });
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert('Borrar producto', `¿Borrar ${existing.name}? Se saca de las recetas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          s.deleteFertilizer(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      footer={
        <>
          {existing ? <IconButton icon="trash-outline" label="Borrar producto" size={56} onPress={remove} /> : null}
          <PrimaryButton label="Guardar" onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>{existing ? existing.name : 'Nuevo fertilizante'}</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>
      <View style={{ gap: 14, marginTop: 18 }}>
        <Field label="Marca" value={brand} onChangeText={setBrand} placeholder="Namasté" />
        <Field label="Producto" value={name} onChangeText={setName} />
        <Field label="Tipo" value={kind} onChangeText={setKind} placeholder="Base, PK, aditivo, enraizante…" />
      </View>
    </Screen>
  );
}
