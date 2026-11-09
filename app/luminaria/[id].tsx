import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Text, View } from 'react-native';
import { SPECTRUM_PRESETS } from '@/presets';
import { activeCycle, lightDensity } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { LIGHT_TYPE_LABEL } from '@/types';
import type { LightType } from '@/types';
import { Body, Card, Chip, Field, H2, IconButton, Muted, PrimaryButton, Screen, Title, Toggle } from '@/ui';
import { fmt, lightLabel, parseNum } from '@/utils';

const LIGHT_TYPES = Object.keys(LIGHT_TYPE_LABEL) as LightType[];

export default function LuminariaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const existing = s.lights.find((l) => l.id === id);

  const [type, setType] = useState<LightType>(existing?.type ?? 'led');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  // Si no se toca el campo, se conserva el valor guardado tal cual (fmt redondea a un decimal).
  const [initialWatts] = useState(existing ? fmt(existing.watts) : '');
  const [watts, setWatts] = useState(initialWatts);
  const [dimmable, setDimmable] = useState(existing?.dimmable ?? false);
  const [initialPpf] = useState(existing?.ppf != null ? fmt(existing.ppf) : '');
  const [ppf, setPpf] = useState(initialPpf);
  const [spectrum, setSpectrum] = useState(existing?.spectrum ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  // Los errores de campos vacíos se muestran recién después de intentar guardar.
  const [tried, setTried] = useState(false);

  const brandOk = brand.trim().length > 0;
  const wattsNumber = parseNum(watts);
  const wattsOk = wattsNumber != null && Number.isFinite(wattsNumber) && wattsNumber > 0;
  const ppfNumber = parseNum(ppf);
  const ppfOk = !ppf.trim() || (ppfNumber != null && Number.isFinite(ppfNumber) && ppfNumber > 0);

  const usedIn = existing ? s.cycles.filter((c) => c.lights?.some((x) => x.lightId === existing.id)) : [];
  const current = activeCycle(s);
  const inCurrent = !!existing && !!current && usedIn.some((c) => c.id === current.id);
  const density = inCurrent && current ? lightDensity(s, current) : undefined;

  const save = () => {
    setTried(true);
    if (!brandOk || !wattsOk || !ppfOk || wattsNumber == null) return;
    s.upsertLight({
      id: existing?.id ?? '',
      type,
      brand: brand.trim(),
      model: model.trim(),
      watts: existing && watts === initialWatts ? existing.watts : wattsNumber,
      dimmable,
      ppf: !ppf.trim() ? undefined : existing && ppf === initialPpf ? existing.ppf : ppfNumber,
      spectrum: spectrum.trim() || undefined,
      notes: notes.trim(),
    });
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const name = lightLabel(existing) || 'esta luminaria';
    const detail = usedIn.length
      ? ` Los ciclos donde se usó la van a seguir mostrando como "${name}", con su potencia.`
      : '';
    Alert.alert('Borrar luminaria', `¿Borrar ${name} de la Biblioteca?${detail}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          s.deleteLight(existing.id);
          router.back();
        },
      },
    ]);
  };

  const showBrandError = tried && !brandOk;
  const showWattsError = (tried || watts.trim().length > 0) && !wattsOk;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        footer={
          <>
            {existing ? <IconButton icon="trash-outline" label="Borrar luminaria" size={56} onPress={remove} /> : null}
            <PrimaryButton label="Guardar luminaria" onPress={save} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Title size={28} style={{ flex: 1 }}>
            {existing ? lightLabel(existing) || 'Luminaria' : 'Nueva luminaria'}
          </Title>
          <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
        </View>

        {existing && usedIn.length ? (
          <Card style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="bulb-outline" size={20} color={colors.lime} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body>{usedIn.length === 1 ? 'Usada en 1 ciclo' : `Usada en ${usedIn.length} ciclos`}</Body>
              {inCurrent ? (
                <Muted>
                  {density
                    ? `En el ciclo actual: ${density.wPerM2} W/m² con ${fmt(density.totalWatts)} W en total${
                        density.ppfdApprox != null ? ` · ≈ ${density.ppfdApprox} µmol/m²/s` : ''
                      }`
                    : 'Está en el ciclo actual.'}
                </Muted>
              ) : null}
            </View>
          </Card>
        ) : null}

        <View style={{ gap: 14, marginTop: 18 }}>
          <View style={{ gap: 8 }}>
            <Muted style={{ fontSize: 13 }}>Tipo</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LIGHT_TYPES.map((t) => (
                <Chip key={t} label={LIGHT_TYPE_LABEL[t]} active={type === t} onPress={() => setType(t)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Field label="Marca" value={brand} onChangeText={setBrand} maxLength={40} returnKeyType="done" />
            {showBrandError ? <ErrorText>Poné la marca de la luminaria.</ErrorText> : null}
          </View>
          <Field label="Modelo" value={model} onChangeText={setModel} maxLength={40} returnKeyType="done" />

          <Section title="Potencia">
            <Field
              label="Potencia real (W)"
              value={watts}
              onChangeText={setWatts}
              keyboardType="decimal-pad"
              placeholder="ej: 240"
            />
            {showWattsError ? (
              <ErrorText>Poné la potencia en W, un número mayor a 0.</ErrorText>
            ) : (
              <Muted>Lo que consume de verdad, no la potencia "equivalente" de la caja.</Muted>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
              <Body style={{ flex: 1 }}>Regulable</Body>
              <Toggle value={dimmable} onChange={setDimmable} label="Regulable" />
            </View>
            <Field
              label="PPF (µmol/s, opcional)"
              value={ppf}
              onChangeText={setPpf}
              keyboardType="decimal-pad"
              placeholder="ej: 650"
            />
            {ppfOk ? (
              <Muted>Dato del fabricante. Si no lo sabés, dejalo vacío.</Muted>
            ) : (
              <ErrorText>Poné un número mayor a 0, o dejalo vacío.</ErrorText>
            )}
          </Section>

          <Section title="Espectro">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SPECTRUM_PRESETS.map((sp) => (
                <Chip key={sp} label={sp} active={spectrum.trim() === sp} onPress={() => setSpectrum(sp)} />
              ))}
            </View>
            <Field
              label="Otro espectro"
              value={spectrum}
              onChangeText={setSpectrum}
              accessibilityLabel="Espectro"
              maxLength={60}
              returnKeyType="done"
            />
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

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 12, color: colors.danger }}>
      {children}
    </Text>
  );
}
