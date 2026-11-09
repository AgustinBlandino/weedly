import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { activeCycle, activePlants } from '@/selectors';
import { useStore } from '@/store';
import { colors } from '@/theme';
import { Body, Card, DateField, Empty, IconButton, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmtDateYear, today } from '@/utils';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function CerrarCicloScreen() {
  const s = useStore();
  const current = activeCycle(s);
  const living = activePlants(s).length;
  // Al cerrar, el ciclo deja de estar activo mientras el modal se va: se sigue mostrando este.
  const [opened] = useState(current);
  const [openedLiving] = useState(living);
  const [closed, setClosed] = useState(false);
  const closing = useRef(false);
  const [date, setDate] = useState(() => today());

  const cycle = closed ? opened : current;
  const plantsLeft = closed ? openedLiving : living;

  if (!cycle) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Cerrar ciclo</Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty text="Esta carpa no tiene un ciclo activo para cerrar." />
        </Rise>
      </Screen>
    );
  }

  const hoy = today();
  const dateOk = date >= cycle.startDate && date <= hoy;

  const confirm = () => {
    if (closing.current || !dateOk) return;
    closing.current = true;
    s.closeCycle(cycle.id, date);
    setClosed(true);
    router.back();
  };

  return (
    <Screen footer={<PrimaryButton label="Cerrar ciclo" disabled={!dateOk} onPress={confirm} style={{ flex: 1 }} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>Cerrar {cycle.name}</Title>
        <IconButton icon="close" label="Cerrar" onPress={close} />
      </View>

      <Rise delay={40}>
        <Card style={{ marginTop: 16, gap: 8 }}>
          <Body style={{ lineHeight: 20 }}>
            No se borra nada: plantas, riegos y fotos quedan en el Diario, donde podés elegir este ciclo para revisarlo.
          </Body>
          {plantsLeft ? (
            <Body style={{ lineHeight: 20, color: colors.flora }}>
              {plantsLeft === 1 ? 'Todavía hay 1 planta viva.' : `Todavía hay ${plantsLeft} plantas vivas.`} Sus días quedan
              congelados en esta fecha y ya no vas a poder regarlas ni sumarles fotos.
            </Body>
          ) : null}
        </Card>
      </Rise>

      <Rise delay={100}>
        <DateField
          label="Fecha de cierre"
          value={date}
          onChange={setDate}
          minDate={cycle.startDate}
          maxDate={hoy}
          error={dateOk ? undefined : `Tiene que ser entre el ${fmtDateYear(cycle.startDate)} y hoy.`}
          style={{ marginTop: 18 }}
        />
        <Muted style={{ marginTop: 10 }}>El ciclo arrancó el {fmtDateYear(cycle.startDate)}.</Muted>
      </Rise>
    </Screen>
  );
}
