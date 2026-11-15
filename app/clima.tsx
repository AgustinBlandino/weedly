import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { activeTent } from '@/selectors';
import { useStore } from '@/store';
import { colors, typo } from '@/theme';
import { Card, Empty, Field, IconButton, Label, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmt, fmtDateTime, parseNum, vpd } from '@/utils';

export default function ClimaScreen() {
  const s = useStore();
  const [temp, setTemp] = useState('');
  const [rh, setRh] = useState('');
  const t = parseNum(temp);
  const h = parseNum(rh);
  const valid = t != null && h != null && h >= 0 && h <= 100 && t > -10 && t < 60;
  const v = valid ? vpd(t!, h!) : undefined;
  const tent = activeTent(s);
  const history = s.climate.filter((c) => c.tentId === s.activeTentId).slice(0, 10);

  const save = () => {
    if (!valid || !tent) return;
    s.addClimate({ tentId: tent.id, date: new Date().toISOString(), tempC: t!, rh: h!, source: 'manual' });
    router.back();
  };

  return (
    <Screen footer={<PrimaryButton label="Guardar lectura" disabled={!valid || !tent} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>Clima de la carpa</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      {!tent ? (
        <View style={{ marginTop: 18 }}>
          <Empty text="Necesitás una carpa activa para guardar el clima. Volvé a la pantalla Cultivo y revisá que esté creada." />
        </View>
      ) : null}

      <Rise delay={40}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Field label="Temperatura (°C)" value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="24,5" style={{ flex: 1 }} />
          <Field label="Humedad (%)" value={rh} onChangeText={setRh} keyboardType="decimal-pad" placeholder="55" style={{ flex: 1 }} />
        </View>
        <Card style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Muted>VPD del aire</Muted>
            <Text style={{ ...typo.hero, color: v != null ? colors.lime : colors.muted }}>
              {v != null ? fmt(v, 2) : '—'} <Text style={typo.bodyStrong}>kPa</Text>
            </Text>
          </View>
          <Muted style={{ maxWidth: 150, textAlign: 'right' }}>Se calcula solo con la temperatura y la humedad.</Muted>
        </Card>
      </Rise>

      {history.length ? (
        <Rise delay={100}>
          <Label style={{ marginTop: 22, marginBottom: 8 }}>Últimas lecturas</Label>
          {history.map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card }}
            >
              <Label style={{ color: colors.textSoft }}>{fmtDateTime(c.date)}</Label>
              <Text style={{ ...typo.labelStrong, fontVariant: ['tabular-nums'], color: colors.text }}>
                {fmt(c.tempC)}° · {Math.round(c.rh)}% · {fmt(vpd(c.tempC, c.rh), 2)} kPa
              </Text>
            </View>
          ))}
        </Rise>
      ) : null}
    </Screen>
  );
}
