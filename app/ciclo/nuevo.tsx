import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Text, View } from 'react-native';
import { SUBSTRATE_PRESETS } from '@/presets';
import { activeCycle, activeTent, newCycleDefaults } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { Body, Chip, DateField, Empty, Field, IconButton, Muted, PrimaryButton, Rise, Screen, Stepper, Title } from '@/ui';
import { fmt, fmtDateYear, parseNum, today } from '@/utils';

const LITERS_MAX = 200;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function NuevoCicloScreen() {
  const s = useStore();
  const tent = activeTent(s);
  const hasActive = !!activeCycle(s);
  const [defaults] = useState(() => newCycleDefaults(s, s.activeTentId));
  // Al empezar, ya hay un ciclo activo mientras el modal se va: no es el caso de "ya tenés uno".
  const [started, setStarted] = useState(false);
  const starting = useRef(false);

  const [name, setName] = useState(defaults.name);
  const [startDate, setStartDate] = useState(() => today());
  const [potCount, setPotCount] = useState(defaults.potCount);
  const [litersInput, setLitersInput] = useState(fmt(defaults.liters));
  const [substrate, setSubstrate] = useState(defaults.substrate);

  if (!tent || (hasActive && !started)) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Ciclo nuevo</Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty
            text={
              tent
                ? 'Esta carpa ya tiene un ciclo activo. Para empezar otro, primero cerrá el actual.'
                : 'No encontré la carpa activa. Tus datos siguen guardados.'
            }
          />
        </Rise>
      </Screen>
    );
  }

  const hoy = today();
  const liters = parseNum(litersInput);
  const litersOk = liters != null && liters > 0 && liters <= LITERS_MAX;
  const substrateOk = substrate.trim().length > 0;
  const minDate = defaults.minStartDate;
  const dateOk = startDate <= hoy && (!minDate || startDate >= minDate);
  const canStart = litersOk && substrateOk && dateOk;
  const inheritedLighting = !defaults.lights.length
    ? 'ninguna'
    : defaults.lights.length === 1
      ? `hereda ${defaults.lights[0].label} (${fmt(defaults.lights[0].watts)} W)`
      : `hereda ${defaults.lights.length} luminarias (${fmt(defaults.lights.reduce((sum, l) => sum + l.watts, 0))} W)`;

  const confirm = () => {
    if (starting.current || !canStart) return;
    const id = s.startCycle(tent.id, {
      name: name.trim() || defaults.name,
      startDate,
      potCount,
      liters,
      substrate: substrate.trim(),
    });
    if (!id) {
      Alert.alert('No pude empezar el ciclo', 'No se guardó nada. Probá de nuevo.');
      return;
    }
    starting.current = true;
    setStarted(true);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen footer={<PrimaryButton label="Empezar ciclo" disabled={!canStart} onPress={confirm} style={{ flex: 1 }} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Ciclo nuevo</Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>
        <Muted style={{ marginTop: 4 }}>
          {tent.name} · {fmt(tent.widthCm)} × {fmt(tent.depthCm)} × {fmt(tent.heightCm)} cm
        </Muted>

        <Rise delay={40} style={{ gap: 16, marginTop: 18 }}>
          <Field label="Nombre" value={name} onChangeText={setName} maxLength={40} returnKeyType="done" />
          <DateField
            label="Fecha de inicio"
            value={startDate}
            onChange={setStartDate}
            minDate={minDate}
            maxDate={hoy}
            error={dateOk || !minDate ? undefined : `Tiene que ser desde el ${fmtDateYear(minDate)}, cuando cerró el ciclo anterior.`}
          />
          <View style={{ gap: 4 }}>
            <Stepper label="Macetas" unit="maceta" value={potCount} min={1} max={defaults.maxPots} onChange={setPotCount} />
            <Muted>Entran hasta {defaults.maxPots} en esta carpa.</Muted>
          </View>
          <Field
            label="Litros por maceta"
            value={litersInput}
            onChangeText={setLitersInput}
            keyboardType="decimal-pad"
            placeholder="10,5"
          />
          {litersOk ? null : (
            <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 12, color: colors.danger }}>
              Poné un valor mayor a 0 y hasta {LITERS_MAX} L.
            </Text>
          )}
          <View style={{ gap: 8 }}>
            <Muted style={{ fontSize: 13 }}>Sustrato</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUBSTRATE_PRESETS.map((sub) => (
                <Chip key={sub} label={sub} active={substrate.trim() === sub} onPress={() => setSubstrate(sub)} />
              ))}
            </View>
            <Field
              label="Otro sustrato"
              value={substrate}
              onChangeText={setSubstrate}
              accessibilityLabel="Sustrato"
              maxLength={40}
              returnKeyType="done"
            />
          </View>
          {substrateOk ? null : (
            <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 12, color: colors.danger }}>
              Contame qué sustrato usás.
            </Text>
          )}
          <View
            accessible
            accessibilityLabel={`Iluminación: ${inheritedLighting}. Se cambia después desde la Carpa.`}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
          >
            <Ionicons name="bulb-outline" size={18} color={defaults.lights.length ? colors.lime : colors.muted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ color: colors.textSoft }}>Iluminación: {inheritedLighting}</Body>
              <Muted>Se cambia después desde la Carpa.</Muted>
            </View>
          </View>
        </Rise>
      </Screen>
    </KeyboardAvoidingView>
  );
}
