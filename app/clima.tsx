import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '@/store';
import { colors, fonts } from '@/theme';
import { Card, Field, IconButton, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmt, fmtDateTime, parseNum, vpd } from '@/utils';

export default function ClimaScreen() {
  const s = useStore();
  const [temp, setTemp] = useState('');
  const [rh, setRh] = useState('');
  const t = parseNum(temp);
  const h = parseNum(rh);
  const valid = t != null && h != null && h >= 0 && h <= 100 && t > -10 && t < 60;
  const v = valid ? vpd(t!, h!) : undefined;
  const history = s.climate.filter((c) => c.tentId === s.activeTentId).slice(0, 10);

  const save = () => {
    if (!valid) return;
    s.addClimate({ tentId: s.activeTentId, date: new Date().toISOString(), tempC: t!, rh: h!, source: 'manual' });
    router.back();
  };

  return (
    <Screen footer={<PrimaryButton label="Guardar lectura" disabled={!valid} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>Clima de la carpa</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <Rise delay={40}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Field label="Temperatura (°C)" value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="24,5" style={{ flex: 1 }} />
          <Field label="Humedad (%)" value={rh} onChangeText={setRh} keyboardType="decimal-pad" placeholder="55" style={{ flex: 1 }} />
        </View>
        <Card style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Muted>VPD del aire</Muted>
            <Text style={{ fontFamily: fonts.display, fontSize: 34, color: v != null ? colors.lime : colors.muted }}>
              {v != null ? fmt(v, 2) : '—'} <Text style={{ fontSize: 16 }}>kPa</Text>
            </Text>
          </View>
          <Muted style={{ maxWidth: 150, textAlign: 'right' }}>Se calcula solo con la temperatura y la humedad.</Muted>
        </Card>
      </Rise>

      {history.length ? (
        <Rise delay={100}>
          <Muted style={{ marginTop: 22, marginBottom: 8, fontSize: 13 }}>Últimas lecturas</Muted>
          {history.map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.card }}
            >
              <Muted style={{ color: colors.textSoft, fontSize: 13 }}>{fmtDateTime(c.date)}</Muted>
              <Text style={{ fontFamily: fonts.bodySemi, color: colors.text, fontSize: 13 }}>
                {fmt(c.tempC)}° · {Math.round(c.rh)}% · {fmt(vpd(c.tempC, c.rh), 2)} kPa
              </Text>
            </View>
          ))}
        </Rise>
      ) : null}
    </Screen>
  );
}
