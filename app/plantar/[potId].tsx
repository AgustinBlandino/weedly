import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { emptyPots } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import type { Genetic } from '@/types';
import { Body, Card, Chip, DateField, Empty, Field, IconButton, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmt, fmtWeeks, today } from '@/utils';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function PlantarScreen() {
  const { potId } = useLocalSearchParams<{ potId: string }>();
  const s = useStore();
  const available = emptyPots(s).find((p) => p.id === potId);
  // Al plantar, la maceta deja de estar vacía mientras el modal se cierra: se sigue mostrando esta.
  const [opened] = useState(available);
  const [planted, setPlanted] = useState(false);
  const planting = useRef(false);

  const [geneticId, setGeneticId] = useState<string | undefined>();
  const [date, setDate] = useState(() => today());
  const [name, setName] = useState('');
  const [plantType, setPlantType] = useState<'foto' | 'auto'>('foto');

  const pot = available ?? (planted ? opened : undefined);

  if (!pot) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Plantar</Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty text="Esta maceta no está disponible: ya tiene una planta o no existe. Volvé a la carpa y elegí una vacía." />
        </Rise>
      </Screen>
    );
  }

  const hoy = today();
  // Si la genética elegida se borró mientras tanto, deja de contar como elegida.
  const selected = s.genetics.find((g) => g.id === geneticId);

  const confirm = () => {
    if (planting.current) return;
    const plantId = s.plantSeed({
      potId: pot.id,
      geneticId: selected?.id,
      germinationDate: date,
      name: name.trim() || undefined,
      type: selected ? undefined : plantType,
    });
    if (!plantId) {
      Alert.alert(
        'No pude plantar',
        'No se guardó nada. Fijate que la maceta siga libre y probá de nuevo.',
      );
      return;
    }
    planting.current = true;
    setPlanted(true);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        footer={
          <PrimaryButton label="Plantar" icon="leaf-outline" disabled={date > hoy} onPress={confirm} style={{ flex: 1 }} />
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Plantar</Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>

        <Rise delay={40}>
          <Card style={{ marginTop: 16, padding: 14, gap: 2 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>
              Maceta de fila {pot.row + 1} (desde el frente), columna {pot.col + 1}
            </Text>
            <Muted>
              {fmt(pot.liters)} L · {pot.substrate}
            </Muted>
          </Card>
        </Rise>

        <Rise delay={100}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
            <Muted style={{ fontSize: 13 }}>Genética</Muted>
            <Pressable onPress={() => router.push('/genetica/nueva')} accessibilityRole="button" hitSlop={12}>
              <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>+ Nueva genética</Text>
            </Pressable>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            <GeneticOption title="Sin asignar" detail="Se la podés asignar más adelante." selected={!selected} onPress={() => setGeneticId(undefined)} />
            {s.genetics.map((g) => (
              <GeneticOption
                key={g.id}
                title={g.name}
                detail={geneticDetail(g)}
                selected={selected?.id === g.id}
                onPress={() => setGeneticId(g.id)}
              />
            ))}
          </View>
        </Rise>

        <Rise delay={160}>
          {selected ? null : (
            <View style={{ gap: 8, marginTop: 18 }}>
              <Muted style={{ fontSize: 13 }}>Tipo</Muted>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Foto" active={plantType === 'foto'} onPress={() => setPlantType('foto')} />
                <Chip label="Auto" active={plantType === 'auto'} onPress={() => setPlantType('auto')} />
              </View>
            </View>
          )}
          <DateField label="Fecha de germinación" value={date} onChange={setDate} maxDate={hoy} style={{ marginTop: 18 }} />
          <Field
            label="Nombre (opcional)"
            value={name}
            onChangeText={setName}
            placeholder="Si lo dejás vacío, se numera sola"
            maxLength={30}
            returnKeyType="done"
            style={{ marginTop: 18 }}
          />
        </Rise>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function geneticDetail(g: Genetic): string {
  return [g.breeder, g.type, g.floweringDays ? `${fmtWeeks(g.floweringDays)} de flora` : ''].filter(Boolean).join(' · ') || 'Sin datos del banco';
}

function GeneticOption({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.sm,
        borderWidth: 1.5,
        borderColor: selected ? colors.lime : colors.card,
        backgroundColor: colors.card,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={`${title}. ${detail}`}
        accessibilityState={{ checked: selected }}
        style={{ flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}
      >
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? colors.lime : colors.border}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontFamily: fonts.bodySemi, color: colors.text }}>{title}</Body>
          <Muted>{detail}</Muted>
        </View>
      </Pressable>
    </View>
  );
}
