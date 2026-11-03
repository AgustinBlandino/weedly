import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { Field, IconButton, Muted, PrimaryButton, Screen, Title } from '@/ui';
import { parseNum } from '@/utils';

export default function RecetaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.recipes.find((r) => r.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [doses, setDoses] = useState<Record<string, string>>(() =>
    Object.fromEntries((existing?.items ?? []).map((it) => [it.fertilizerId, String(it.mlPerL).replace('.', ',')])),
  );

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ej: "Flora semanas 7–9".');
      return;
    }
    const items = s.fertilizers
      .map((f) => ({ fertilizerId: f.id, mlPerL: parseNum(doses[f.id] ?? '') ?? 0 }))
      .filter((it) => it.mlPerL > 0);
    s.upsertRecipe({ id: existing?.id ?? '', name: name.trim(), items });
    router.back();
  };

  const remove = () =>
    existing &&
    Alert.alert('Borrar receta', `¿Borrar ${existing.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          s.deleteRecipe(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      footer={
        <>
          {existing ? <IconButton icon="trash-outline" label="Borrar receta" size={56} onPress={remove} /> : null}
          <PrimaryButton label="Guardar receta" onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>{existing ? existing.name : 'Nueva receta'}</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Flora · semanas 7–9" style={{ marginTop: 18 }} />
      <Muted style={{ marginTop: 18, marginBottom: 4, fontSize: 13 }}>
        Dosis en ml por litro (dejá vacío lo que no uses). Usá la dosis de la etiqueta.
      </Muted>
      {s.fertilizers.map((f) => (
        <View
          key={f.id}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>{f.name}</Text>
            <Muted>{[f.brand, f.kind].filter(Boolean).join(' · ')}</Muted>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput
              value={doses[f.id] ?? ''}
              onChangeText={(v) => setDoses((cur) => ({ ...cur, [f.id]: v }))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="#7F897C"
              accessibilityLabel={`Dosis de ${f.name} en ml por litro`}
              style={{
                width: 70,
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardAlt,
                color: colors.text,
                textAlign: 'center',
                fontFamily: fonts.bodySemi,
                fontSize: 15,
              }}
            />
            <Muted>ml/L</Muted>
          </View>
        </View>
      ))}
    </Screen>
  );
}
