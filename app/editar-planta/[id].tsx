import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { isPlantActive, phasesOf } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { PHASE_LABEL } from '@/types';
import { Body, Chip, Field, IconButton, Muted, PrimaryButton, Screen, Title } from '@/ui';
import { isValidYmd, parseNum } from '@/utils';

export default function EditarPlantaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const plant = s.plants.find((p) => p.id === id);
  const pot = plant ? s.pots.find((p) => p.id === plant.potId) : undefined;
  const phases = plant ? phasesOf(s, plant.id) : [];

  const [name, setName] = useState(plant?.name ?? '');
  const [germ, setGerm] = useState(plant?.germinationDate ?? '');
  const [geneticId, setGeneticId] = useState<string | undefined>(plant?.geneticId);
  const [description, setDescription] = useState(plant?.description ?? '');
  const [liters, setLiters] = useState(pot ? String(pot.liters) : '');
  const [substrate, setSubstrate] = useState(pot?.substrate ?? '');
  const [phaseDates, setPhaseDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(phases.map((p) => [p.id, p.date])),
  );

  if (!plant || !pot) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Editar planta</Title>
          <IconButton icon="close" label="Cerrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
        <Body style={{ marginTop: 18, color: colors.textSoft }}>No encontré esa planta. Puede que ya no exista.</Body>
      </Screen>
    );
  }

  // La maceta de una planta terminada ya no es suya: puede tener otra planta o ser de un ciclo cerrado.
  const editsPot = isPlantActive(s, plant);
  const badDates = !isValidYmd(germ) || Object.values(phaseDates).some((d) => !isValidYmd(d));

  const save = () => {
    if (badDates) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD, por ejemplo 2026-07-30.');
      return;
    }
    s.updatePlant(plant.id, { name: name.trim() || plant.name, germinationDate: germ, geneticId, description: description.trim() });
    if (editsPot) {
      const l = parseNum(liters);
      s.updatePot(pot.id, { liters: l ?? pot.liters, substrate: substrate.trim() });
    }
    phases.forEach((p) => {
      const d = phaseDates[p.id];
      if (d && d !== p.date) {
        s.deletePhase(p.id);
        s.changePhase(plant.id, p.phase, d);
      }
    });
    router.back();
  };

  const removePhase = (phaseId: string) =>
    Alert.alert('Borrar cambio de fase', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          s.deletePhase(phaseId);
          setPhaseDates((cur) => {
            const next = { ...cur };
            delete next[phaseId];
            return next;
          });
        },
      },
    ]);

  return (
    <Screen footer={<PrimaryButton label="Guardar" onPress={save} style={{ flex: 1 }} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>Editar {plant.name}</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 14, marginTop: 18 }}>
        <Field label="Nombre o apodo" value={name} onChangeText={setName} />
        <Field label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Estructura, olor, cómo viene respondiendo…" />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted style={{ fontSize: 13 }}>Genética</Muted>
            <Pressable onPress={() => router.push('/genetica/nueva')} hitSlop={8}>
              <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>+ Nueva genética</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Sin asignar" active={!geneticId} onPress={() => setGeneticId(undefined)} />
            {s.genetics.map((g) => (
              <Chip key={g.id} label={g.name} active={geneticId === g.id} onPress={() => setGeneticId(g.id)} />
            ))}
          </View>
        </View>

        {!editsPot ? null : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Litros de maceta" value={liters} onChangeText={setLiters} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Field label="Sustrato" value={substrate} onChangeText={setSubstrate} style={{ flex: 1 }} />
          </View>
        )}

        <Field label="Germinación (AAAA-MM-DD)" value={germ} onChangeText={setGerm} autoCapitalize="none" />

        <Muted style={{ fontSize: 13, marginTop: 4 }}>Cambios de fase</Muted>
        {phases.map((p) =>
          phaseDates[p.id] !== undefined ? (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <Field
                label={`${PHASE_LABEL[p.phase]} desde`}
                value={phaseDates[p.id]}
                onChangeText={(v) => setPhaseDates((cur) => ({ ...cur, [p.id]: v }))}
                autoCapitalize="none"
                style={{ flex: 1 }}
              />
              <IconButton icon="trash-outline" label={`Borrar fase ${PHASE_LABEL[p.phase]}`} onPress={() => removePhase(p.id)} />
            </View>
          ) : null,
        )}
        {badDates ? <Muted style={{ color: colors.danger }}>Revisá las fechas: formato AAAA-MM-DD.</Muted> : null}
      </View>
    </Screen>
  );
}
