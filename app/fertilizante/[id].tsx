import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { FERTILIZER_STAGES } from '@/selectors';
import { useStore } from '@/store';
import type { DoseUnit, FertilizerStage } from '@/types';
import { Chip, Field, IconButton, Label, Muted, PrimaryButton, Screen, Title } from '@/ui';

// "0-9-18", "4-3-6", "0,1-0,01-0,1": tres números separados por guiones.
const NPK_RE = /^\d+([.,]\d+)?-\d+([.,]\d+)?-\d+([.,]\d+)?$/;

export default function FertilizanteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.fertilizers.find((f) => f.id === id);
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [stage, setStage] = useState<FertilizerStage | undefined>(existing?.stage);
  const [npk, setNpk] = useState(existing?.npk ?? '');
  const [unit, setUnit] = useState<DoseUnit>(existing?.unit ?? 'ml');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Poné el nombre del producto.');
      return;
    }
    if (!stage) {
      Alert.alert('Falta la fase', 'Elegí para qué fase del cultivo es el producto.');
      return;
    }
    const cleanNpk = npk.replace(/\s/g, '');
    if (cleanNpk && !NPK_RE.test(cleanNpk)) {
      Alert.alert('NPK inválido', 'Escribilo como figura en la etiqueta, ej: 0-9-18. Si no lo sabés, dejalo vacío.');
      return;
    }
    // Se conservan los campos que no se editan acá (catalogId).
    s.upsertFertilizer({
      ...existing,
      id: existing?.id ?? '',
      brand: brand.trim(),
      name: name.trim(),
      stage,
      npk: cleanNpk || undefined,
      unit,
    });
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert(
      'Borrar producto',
      `¿Borrar ${existing.name} de tu estante? Los riegos que lo usaron conservan el nombre y la dosis.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            s.deleteFertilizer(existing.id);
            router.back();
          },
        },
      ],
    );

  return (
    <Screen
      footer={
        <>
          {existing ? <IconButton icon="trash-outline" label="Borrar producto" size={56} onPress={remove} /> : null}
          <PrimaryButton label="Guardar" onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Title style={{ flex: 1 }}>{existing ? existing.name : 'Nuevo fertilizante'}</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>
      <View style={{ gap: 14, marginTop: 18 }}>
        <Field label="Marca" value={brand} onChangeText={setBrand} placeholder="Opcional" />
        <Field label="Producto" value={name} onChangeText={setName} />

        <View style={{ gap: 8 }}>
          <Label>Fase</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FERTILIZER_STAGES.map((st) => (
              <Chip key={st.value} label={st.label} active={stage === st.value} onPress={() => setStage(st.value)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Field
            label="NPK"
            value={npk}
            onChangeText={setNpk}
            placeholder="Opcional, ej: 0-9-18"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <Muted>Como figura en la etiqueta. Si no lo sabés, dejalo vacío.</Muted>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Se dosifica en</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="ml/L" active={unit === 'ml'} onPress={() => setUnit('ml')} />
            <Chip label="g/L" active={unit === 'g'} onPress={() => setUnit('g')} />
          </View>
          <Muted>g/L para los productos en polvo.</Muted>
        </View>
      </View>
    </Screen>
  );
}
