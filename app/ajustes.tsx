import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { exportDataJson, IS_TEST_STORE, parseBackup, STORE_KEY, useStore } from '@/store';
import { colors, radius, typo } from '@/theme';
import { Body, Card, Field, H2, IconButton, Muted, Screen, Title } from '@/ui';
import { fmt, parseNum, today } from '@/utils';

// Completar antes de publicar: las stores piden una política de privacidad en una URL pública.
// Mientras estén vacías, las filas no se muestran.
const PRIVACY_URL = '';
const SUPPORT_URL = '';

const MEASURE_MIN = 20;
const MEASURE_MAX = 400;

async function exportCopy() {
  try {
    const file = new File(Paths.cache, `weedly-copia-${today()}.json`);
    if (file.exists) file.delete();
    file.create();
    await file.write(exportDataJson());
    if (!(await Sharing.isAvailableAsync())) throw new Error('sin share');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Copia de Weedly' });
  } catch {
    Alert.alert('No pude exportar la copia', 'Tus datos siguen intactos. Probá de nuevo en un rato.');
  }
}

async function importCopy() {
  let text: string;
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    text = await new File(res.assets[0].uri).text();
  } catch {
    Alert.alert('No pude abrir el archivo', 'Probá elegirlo de nuevo.');
    return;
  }
  let data: ReturnType<typeof parseBackup>;
  try {
    data = parseBackup(text);
  } catch (e) {
    Alert.alert('No pude importar la copia', e instanceof Error ? e.message : 'El archivo no es una copia de Weedly.');
    return;
  }
  const plants = data.plants.length;
  Alert.alert(
    'Reemplazar tus datos',
    `La copia tiene ${data.tents.length === 1 ? '1 carpa' : `${data.tents.length} carpas`} y ${plants === 1 ? '1 planta' : `${plants} plantas`}. ` +
      'Todo lo que tenés ahora en la app se reemplaza por la copia. Las fotos no viajan en la copia: solo se ven si siguen en este celular.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reemplazar', style: 'destructive', onPress: () => useStore.getState().replaceAllData(data) },
    ],
  );
}

function resetAll() {
  Alert.alert('Borrar todo', 'Se borran tus carpas, ciclos, plantas, registros y fotos. No se puede deshacer.', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Seguir',
      style: 'destructive',
      onPress: () =>
        Alert.alert('¿Seguro?', 'Si querés guardar algo, exportá una copia antes.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Borrar todo', style: 'destructive', onPress: () => useStore.getState().resetAllData() },
        ]),
    },
  ]);
}

export default function AjustesScreen() {
  const s = useStore();
  const tent = s.tents.find((t) => t.id === s.activeTentId) ?? s.tents[0];
  const [name, setName] = useState(tent?.name ?? '');
  const [width, setWidth] = useState(tent ? fmt(tent.widthCm) : '');
  const [depth, setDepth] = useState(tent ? fmt(tent.depthCm) : '');
  const [height, setHeight] = useState(tent ? fmt(tent.heightCm) : '');
  const [every, setEvery] = useState(String(s.settings.wateringEveryDays));

  // Se guarda al escribir, solo si el valor es válido; un texto a medio escribir no pisa lo guardado.
  const measure = (key: 'widthCm' | 'depthCm' | 'heightCm', set: (v: string) => void) => (v: string) => {
    set(v);
    const n = parseNum(v);
    if (tent && n != null && n >= MEASURE_MIN && n <= MEASURE_MAX) s.updateTent(tent.id, { [key]: Math.round(n) });
  };
  const measuresOk = [width, depth, height].every((v) => {
    const n = parseNum(v);
    return n != null && n >= MEASURE_MIN && n <= MEASURE_MAX;
  });

  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>Ajustes</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 14, marginTop: 18 }}>
        {tent ? (
          <Card style={{ gap: 12 }}>
            <H2>Tu carpa</H2>
            <Field
              label="Nombre"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (v.trim()) s.updateTent(tent.id, { name: v.trim() });
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Ancho (cm)" value={width} onChangeText={measure('widthCm', setWidth)} keyboardType="numeric" style={{ flex: 1 }} />
              <Field label="Fondo (cm)" value={depth} onChangeText={measure('depthCm', setDepth)} keyboardType="numeric" style={{ flex: 1 }} />
              <Field label="Alto (cm)" value={height} onChangeText={measure('heightCm', setHeight)} keyboardType="numeric" style={{ flex: 1 }} />
            </View>
            {measuresOk ? (
              <Muted>La cantidad de macetas no cambia desde acá.</Muted>
            ) : (
              <Muted accessibilityRole="alert" style={{ color: colors.danger }}>
                Poné medidas entre {MEASURE_MIN} y {MEASURE_MAX} cm. Hasta que estén bien, queda lo último válido.
              </Muted>
            )}
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
        ) : null}

        <Card style={{ gap: 4 }}>
          <H2>Tus datos</H2>
          <Muted style={{ marginBottom: 6 }}>Todo vive en este celular. Exportá una copia de vez en cuando y guardala en otro lado.</Muted>
          {IS_TEST_STORE ? (
            <View style={{ backgroundColor: colors.floraBg, borderRadius: radius.sm, padding: 12, marginBottom: 6 }}>
              <Body style={{ color: colors.flora }}>Espacio de prueba: {STORE_KEY}</Body>
            </View>
          ) : null}
          <ActionRow icon="share-outline" label="Exportar copia" hint="Un archivo con tus registros, sin las fotos" onPress={exportCopy} />
          <ActionRow icon="download-outline" label="Importar copia" hint="Reemplaza lo que tenés por una copia" onPress={importCopy} />
          <ActionRow icon="trash-outline" label="Borrar todo y empezar de cero" onPress={resetAll} danger />
        </Card>

        <Card style={{ gap: 8 }}>
          <H2>Acerca de</H2>
          <Body style={{ color: colors.textSoft }}>
            Weedly no tiene cuentas y no manda tus datos a ningún servidor: lo que cargás queda en tu celular.
          </Body>
          <Body style={{ color: colors.textSoft }}>
            Es una herramienta para registrar tu cultivo, pensada para mayores de 18 años. Respetá las leyes de tu país sobre el cultivo de cannabis.
          </Body>
          {PRIVACY_URL ? <ActionRow icon="shield-checkmark-outline" label="Política de privacidad" onPress={() => Linking.openURL(PRIVACY_URL)} /> : null}
          {SUPPORT_URL ? <ActionRow icon="chatbubble-outline" label="Contacto y sugerencias" onPress={() => Linking.openURL(SUPPORT_URL)} /> : null}
          {version ? <Muted>Versión {version}</Muted> : null}
        </Card>
      </View>
    </Screen>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.lime} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.bodyStrong, color }}>{label}</Text>
        {hint ? <Muted>{hint}</Muted> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
