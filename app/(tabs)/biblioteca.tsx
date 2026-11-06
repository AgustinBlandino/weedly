import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { namastePack } from '@/seed';
import { exportDataJson, IS_TEST_STORE, STORE_KEY, useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import { Body, Card, Chip, Empty, Field, H2, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { fmt, parseNum } from '@/utils';

type Seg = 'geneticas' | 'fertilizantes' | 'recetas' | 'ajustes';

// Cancelar el share resuelve la promesa con normalidad: solo un rechazo o una falla al armar el JSON es un error.
async function exportCopy() {
  try {
    await Share.share({ message: exportDataJson() });
  } catch {
    Alert.alert('No pude exportar la copia', 'Tus datos siguen intactos. Probá de nuevo en un rato.');
  }
}

export default function BibliotecaScreen() {
  const s = useStore();
  const [seg, setSeg] = useState<Seg>('geneticas');
  const [every, setEvery] = useState(String(s.settings.wateringEveryDays));

  const missingFromPack = namastePack.filter((p) => !s.fertilizers.some((f) => f.id === p.id)).length;

  const addRoute: Record<Exclude<Seg, 'ajustes'>, string> = {
    geneticas: '/genetica/nueva',
    fertilizantes: '/fertilizante/nuevo',
    recetas: '/receta/nueva',
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={32}>Biblioteca</Title>
        {seg !== 'ajustes' ? (
          <Pressable
            onPress={() => router.push(addRoute[seg])}
            accessibilityRole="button"
            accessibilityLabel="Agregar"
            style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={24} color={colors.bg} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <Chip label="Genéticas" active={seg === 'geneticas'} onPress={() => setSeg('geneticas')} />
        <Chip label="Fertilizantes" active={seg === 'fertilizantes'} onPress={() => setSeg('fertilizantes')} />
        <Chip label="Recetas" active={seg === 'recetas'} onPress={() => setSeg('recetas')} />
        <Chip label="Ajustes" active={seg === 'ajustes'} onPress={() => setSeg('ajustes')} />
      </View>

      <Rise key={seg} style={{ marginTop: 16, gap: 10 }}>
        {seg === 'geneticas' ? (
          s.genetics.length ? (
            s.genetics.map((g) => (
              <Row
                key={g.id}
                title={g.name}
                subtitle={[g.breeder, g.type, g.floweringDays ? `${g.floweringDays} d flora` : ''].filter(Boolean).join(' · ')}
                extra={[...g.effects, ...g.flavors].slice(0, 4).join(' · ')}
                onPress={() => router.push(`/genetica/${g.id}`)}
              />
            ))
          ) : (
            <Empty text="Cargá tus genéticas con lo que dice el banco: efectos, sabores y días de flora. Después se las asignás a cada planta." />
          )
        ) : null}

        {seg === 'fertilizantes' ? (
          <>
            {s.fertilizers.length ? (
              s.fertilizers.map((f) => (
                <Row
                  key={f.id}
                  title={f.name}
                  subtitle={[f.brand, f.kind].filter(Boolean).join(' · ')}
                  onPress={() => router.push(`/fertilizante/${f.id}`)}
                />
              ))
            ) : (
              <Empty text="Todavía no tenés fertilizantes. Sumá el pack Namasté o cargá los tuyos con el botón +." />
            )}
            {missingFromPack ? (
              <>
                <PrimaryButton label="Sumar pack Namasté" icon="add" onPress={s.addNamastePack} />
                {s.fertilizers.length ? (
                  <Muted>
                    {missingFromPack === 1 ? 'Falta 1 producto del pack.' : `Faltan ${missingFromPack} productos del pack.`}
                  </Muted>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {seg === 'recetas' ? (
          s.recipes.length ? (
            s.recipes.map((r) => (
              <Row
                key={r.id}
                title={r.name}
                subtitle={r.items
                  .map((it) => {
                    const f = s.fertilizers.find((x) => x.id === it.fertilizerId);
                    return `${f?.name ?? '?'} ${fmt(it.mlPerL)} ml/L`;
                  })
                  .join(' · ')}
                onPress={() => router.push(`/receta/${r.id}`)}
              />
            ))
          ) : (
            <Empty text="Armá tus recetas con las dosis de la etiqueta. Al regar elegís una y te calcula los ml." />
          )
        ) : null}

        {seg === 'ajustes' ? (
          <>
            <Card style={{ gap: 10 }}>
              <Field
                label="Avisar riego cada cuántos días"
                value={every}
                onChangeText={(v) => {
                  setEvery(v);
                  const n = parseNum(v);
                  if (n != null && n >= 1 && n <= 30) s.updateSettings({ wateringEveryDays: Math.round(n) });
                }}
                keyboardType="numeric"
              />
              <Muted>Las macetas se marcan en ámbar cuando pasan estos días desde su último riego.</Muted>
            </Card>

            <Card style={{ gap: 10 }}>
              <H2>Tus datos</H2>
              {IS_TEST_STORE ? (
                <View style={{ backgroundColor: colors.floraBg, borderRadius: radius.sm, padding: 12 }}>
                  <Body style={{ color: colors.flora }}>Espacio de prueba: {STORE_KEY}</Body>
                </View>
              ) : null}
              <PrimaryButton label="Exportar copia (JSON)" icon="share-outline" onPress={exportCopy} />
              <Muted>La copia incluye tus registros, pero no las imágenes de las fotos.</Muted>
            </Card>
          </>
        ) : null}
      </Rise>
    </Screen>
  );
}

function Row({ title, subtitle, extra, onPress }: { title: string; subtitle?: string; extra?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ transform: [{ perspective: 700 }, { rotateX: pressed ? '6deg' : '0deg' }, { scale: pressed ? 0.98 : 1 }] })}
    >
      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text }}>{title}</Text>
          {subtitle ? <Muted>{subtitle}</Muted> : null}
          {extra ? <Muted style={{ color: colors.textSoft }}>{extra}</Muted> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}
