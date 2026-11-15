import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, PHASE_STYLE } from './PhaseBar';
import type { PlantSummary } from './selectors';
import { colors, radius, typo } from './theme';
import { Phase, PHASE_LABEL, Plant } from './types';
import { Body, Chip, DateField, H2, Muted, PrimaryButton, Toggle } from './ui';
import { daysBetween, fmtDate, today } from './utils';

/** Hoja para confirmar un cambio de fase: elegir la fecha y, si hay, sumar al resto de la carpa. */
export function PhaseChangeSheet({
  visible,
  plant,
  sum,
  next,
  siblings,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  plant: Plant;
  sum: PlantSummary;
  next: Phase;
  siblings: { plant: Plant; phaseStart: string }[];
  onClose: () => void;
  onConfirm: (date: string, plantIds: string[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const hoy = today();
  const ayer = addDays(hoy, -1);
  const [date, setDate] = useState(hoy);
  const [all, setAll] = useState(siblings.length > 0);

  useEffect(() => {
    if (visible) {
      setDate(hoy);
      setAll(siblings.length > 0);
    }
    // Solo al abrir: después manda lo que elige el usuario.
  }, [visible]);

  const st = PHASE_STYLE[next];
  const current = PHASE_LABEL[sum.phase].toLowerCase();
  const target = PHASE_LABEL[next].toLowerCase();
  const included = all ? siblings.filter((x) => x.phaseStart <= date) : [];
  const left = all ? siblings.filter((x) => x.phaseStart > date) : [];
  const count = 1 + included.length;
  const closedDays = Math.max(0, daysBetween(sum.phaseStart, date));
  const harvest = next === 'flora' && sum.floraTarget ? addDays(date, sum.floraTarget) : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDeep, opacity: 0.7 }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            backgroundColor: colors.sheet,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={st.icon} size={22} color={st.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <H2>Pasar a {target}</H2>
                <Muted>{plant.name}</Muted>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Hoy" active={date === hoy} onPress={() => setDate(hoy)} />
                {ayer >= sum.phaseStart ? <Chip label="Ayer" active={date === ayer} onPress={() => setDate(ayer)} /> : null}
              </View>
              <DateField label="Fecha de inicio" value={date} onChange={setDate} minDate={sum.phaseStart} maxDate={hoy} />
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: radius.sm, padding: 14, gap: 6 }}>
              {sum.phase !== 'germinacion' ? (
                <Body style={{ color: colors.textSoft }}>
                  Cierra {current} con {closedDays} {closedDays === 1 ? 'día' : 'días'}.
                </Body>
              ) : null}
              <Body style={{ color: colors.textSoft }}>
                Arranca {target} el {fmtDate(date)}.
              </Body>
              {harvest ? (
                <Body style={{ color: colors.textSoft }}>
                  Según el breeder, cosecha estimada ~{fmtDate(harvest)}.
                </Body>
              ) : null}
            </View>

            {siblings.length ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...typo.bodyStrong, color: colors.text }}>Aplicar a toda la carpa</Text>
                    <Muted numberOfLines={2}>
                      {siblings.length === 1 ? 'También' : `También las otras ${siblings.length}:`}{' '}
                      {siblings.map((x) => x.plant.name).join(', ')}
                    </Muted>
                  </View>
                  <Toggle value={all} onChange={setAll} label="Aplicar a toda la carpa" />
                </View>
                {left.length ? (
                  <Muted style={{ color: colors.flora }}>
                    {left.map((x) => x.plant.name).join(', ')} {left.length === 1 ? 'arrancó' : 'arrancaron'} {current} después
                    de esa fecha y {left.length === 1 ? 'queda' : 'quedan'} igual.
                  </Muted>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: 4 }}>
              <PrimaryButton
                label={count > 1 ? `Pasar ${count} plantas a ${target}` : `Pasar a ${target}`}
                onPress={() => onConfirm(date, [plant.id, ...included.map((x) => x.plant.id)])}
              />
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ ...typo.bodyStrong, color: colors.textSoft }}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
