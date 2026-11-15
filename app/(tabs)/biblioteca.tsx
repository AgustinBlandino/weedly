import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { fertilizerInfo, geneticColor } from '@/selectors';
import { exportDataJson, IS_TEST_STORE, STORE_KEY, useStore } from '@/store';
import { colors, radius, tagTones, typo } from '@/theme';
import { Body, Card, Chip, Empty, Field, H2, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';
import { LIGHT_TYPE_LABEL, type Genetic } from '@/types';
import { fmt, fmtWeeks, lightLabel, parseNum } from '@/utils';

type Seg = 'geneticas' | 'iluminacion' | 'fertilizantes' | 'ajustes';

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

  const addRoute: Record<Exclude<Seg, 'ajustes'>, string> = {
    geneticas: '/genetica/nueva',
    iluminacion: '/luminaria/nueva',
    fertilizantes: '/fertilizante/nuevo',
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title display>Biblioteca</Title>
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
        <Chip label="Iluminación" active={seg === 'iluminacion'} onPress={() => setSeg('iluminacion')} />
        <Chip label="Fertilizantes" active={seg === 'fertilizantes'} onPress={() => setSeg('fertilizantes')} />
        <Chip label="Ajustes" active={seg === 'ajustes'} onPress={() => setSeg('ajustes')} />
      </View>

      <Rise key={seg} style={{ marginTop: 16, gap: 10 }}>
        {seg === 'geneticas' ? (
          s.genetics.length ? (
            s.genetics.map((g) => <GeneticRow key={g.id} genetic={g} color={geneticColor(s, g.id)} />)
          ) : (
            <Empty text="Cargá tus genéticas con lo que dice el banco: tipo, semanas de flora, efectos y sabores." />
          )
        ) : null}

        {seg === 'iluminacion' ? (
          s.lights.length ? (
            s.lights.map((l) => (
              <Row
                key={l.id}
                title={lightLabel(l)}
                subtitle={[LIGHT_TYPE_LABEL[l.type], `${fmt(l.watts)} W`, l.dimmable ? 'Regulable' : ''].filter(Boolean).join(' · ')}
                extra={l.spectrum}
                onPress={() => router.push(`/luminaria/${l.id}`)}
              />
            ))
          ) : (
            <Empty text="Cargá las luminarias que usás: tipo, potencia real y, si lo tenés, el PPF." />
          )
        ) : null}

        {seg === 'fertilizantes' ? (
          <>
            {s.fertilizers.length ? (
              s.fertilizers.map((f) => (
                <Row
                  key={f.id}
                  title={f.name}
                  subtitle={[f.brand, fertilizerInfo(f)].filter(Boolean).join(' · ')}
                  onPress={() => router.push(`/fertilizante/${f.id}`)}
                />
              ))
            ) : (
              <Empty text="Todavía no tenés fertilizantes. Agregalos desde el catálogo o cargá los tuyos con el botón +." />
            )}
          </>
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

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const MAX_TAGS = 3;

/** Pills del tipo de semilla con ícono. Un tipo escrito a mano que no se reconoce se muestra tal cual. */
function typePills(type: string): { icon?: IconName; label: string }[] {
  const pills: { icon?: IconName; label: string }[] = [];
  if (/auto/i.test(type)) pills.push({ icon: 'flash-outline', label: 'Auto' });
  else if (/foto/i.test(type)) pills.push({ icon: 'sunny-outline', label: 'Foto' });
  if (/fem/i.test(type)) pills.push({ icon: 'female', label: 'Fem' });
  else if (/regular/i.test(type)) pills.push({ icon: 'male-female', label: 'Regular' });
  if (!pills.length && type.trim()) pills.push({ label: type.trim() });
  return pills;
}

/** Alterna efectos y sabores para que la tarjeta muestre de los dos aunque haya muchos de uno. */
function interleaveTags(g: Genetic): { label: string; tone: keyof typeof tagTones }[] {
  const out: { label: string; tone: keyof typeof tagTones }[] = [];
  for (let i = 0; i < Math.max(g.effects.length, g.flavors.length); i++) {
    if (g.effects[i]) out.push({ label: g.effects[i], tone: 'effect' });
    if (g.flavors[i]) out.push({ label: g.flavors[i], tone: 'flavor' });
  }
  return out;
}

function GeneticRow({ genetic: g, color }: { genetic: Genetic; color: string }) {
  const pills = [
    ...typePills(g.type),
    ...(g.floweringDays ? [{ icon: 'time-outline' as IconName, label: fmtWeeks(g.floweringDays) }] : []),
    ...(g.thc ? [{ label: `THC ${g.thc}` }] : []),
  ];
  const tags = interleaveTags(g);
  const hidden = tags.length - MAX_TAGS;

  return (
    <Pressable
      onPress={() => router.push(`/genetica/${g.id}`)}
      accessibilityRole="button"
      accessibilityLabel={g.name}
      style={({ pressed }) => ({ transform: [{ perspective: 700 }, { rotateX: pressed ? '6deg' : '0deg' }, { scale: pressed ? 0.98 : 1 }] })}
    >
      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: color }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ ...typo.bodyStrong, color: colors.text }}>{g.name}</Text>
            {g.breeder ? <Muted>{g.breeder}</Muted> : null}
          </View>
          {pills.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {pills.map((p) => (
                <View
                  key={p.label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cardAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  {p.icon ? <Ionicons name={p.icon} size={12} color={colors.textSoft} /> : null}
                  <Text style={{ ...typo.badge, color: colors.textSoft }}>{p.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {tags.slice(0, MAX_TAGS).map((t) => (
                <View key={`${t.tone}-${t.label}`} style={{ backgroundColor: tagTones[t.tone].bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ ...typo.badge, color: tagTones[t.tone].fg }}>{t.label}</Text>
                </View>
              ))}
              {hidden > 0 ? (
                <View style={{ borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Text style={{ ...typo.badge, color: colors.muted }}>+{hidden}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

function Row({
  title,
  subtitle,
  extra,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  extra?: string;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ transform: [{ perspective: 700 }, { rotateX: pressed ? '6deg' : '0deg' }, { scale: pressed ? 0.98 : 1 }] })}
    >
      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...typo.bodyStrong, color: colors.text }}>{title}</Text>
          {subtitle ? <Muted>{subtitle}</Muted> : null}
          {extra ? <Muted style={{ color: colors.textSoft }}>{extra}</Muted> : null}
        </View>
        {trailing ? <Muted style={{ color: colors.textSoft, maxWidth: 90, textAlign: 'right' }}>{trailing}</Muted> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}
