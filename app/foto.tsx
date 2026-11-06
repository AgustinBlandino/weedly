import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { activePlants, summarize } from '@/selectors';
import { useStore } from '@/store';
import { colors, fonts, radius } from '@/theme';
import { TiltPhoto } from '@/TiltPhoto';
import { PHASE_LABEL } from '@/types';
import { Chip, Empty, Field, IconButton, Muted, PrimaryButton, Rise, Screen, Title, Toggle } from '@/ui';
import { fmtDate, today } from '@/utils';

const TAGS = ['Nota', 'Poda', 'LST', 'SCROG', 'Defoliación', 'Plaga', 'Cosecha'];

export default function FotoScreen() {
  const { plantId: param } = useLocalSearchParams<{ plantId?: string }>();
  const s = useStore();
  const list = activePlants(s);
  const initial = s.plants.some((p) => p.id === param) ? param : undefined;
  const [plantId, setPlantId] = useState<string | undefined>(initial ?? list[0]?.plant.id);
  const [uri, setUri] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['Nota']);
  const [asCover, setAsCover] = useState(true);

  const plant = s.plants.find((p) => p.id === plantId);
  const sum = plant ? summarize(s, plant) : undefined;

  const pick = async (from: 'camera' | 'library') => {
    const perm =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Sin permiso', from === 'camera' ? 'Necesito acceso a la cámara.' : 'Necesito acceso a tus fotos.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };
    const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };

  const save = () => {
    if (!plantId || !uri) return;
    s.addPhoto(
      { plantId, uri, date: new Date().toISOString(), description: description.trim(), tags },
      asCover,
    );
    router.back();
  };

  if (!list.length && !initial) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={28}>Nueva foto</Title>
          <IconButton icon="close" label="Cerrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
        <Rise delay={40} style={{ marginTop: 18 }}>
          <Empty text="Todavía no hay plantas para fotografiar. Cuando tengas una planta en la carpa, vas a poder guardar sus fotos desde acá." />
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <PrimaryButton
          label={uri ? 'Guardar foto' : 'Elegí o sacá una foto'}
          disabled={!uri || !plantId}
          onPress={save}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title size={28}>Nueva foto</Title>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <Rise delay={30} style={{ marginTop: 14 }}>
        <TiltPhoto uri={uri} height={270} emptyLabel="Vista previa de tu foto">
          {plant && sum ? (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Tag text={plant.name} />
              <Tag text={`${PHASE_LABEL[sum.phase]} día ${sum.dayInPhase}`} flora={sum.phase === 'flora'} />
              <Tag text={fmtDate(today())} />
            </View>
          ) : null}
        </TiltPhoto>
      </Rise>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <SourceButton icon="camera-outline" label="Cámara" onPress={() => pick('camera')} />
        <SourceButton icon="images-outline" label="Galería" onPress={() => pick('library')} />
      </View>

      {!initial ? (
        <>
          <Muted style={{ marginTop: 16, marginBottom: 8, fontSize: 13 }}>Planta</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {list.map(({ plant: p }) => (
              <Chip key={p.id} label={p.name} active={plantId === p.id} onPress={() => setPlantId(p.id)} />
            ))}
          </View>
        </>
      ) : null}

      <Field
        label="Descripción de la foto"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="¿Qué ves hoy? Ej: tricomas lechosos, hojas de abajo amarillentas…"
        style={{ marginTop: 16 }}
      />

      <Muted style={{ marginTop: 16, marginBottom: 8, fontSize: 13 }}>Etiquetas</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TAGS.map((t) => (
          <Chip
            key={t}
            label={t}
            active={tags.includes(t)}
            onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>
          Usar como portada{plant ? ` de ${plant.name}` : ''}
        </Text>
        <Toggle value={asCover} onChange={setAsCover} label="Usar como portada" />
      </View>
    </Screen>
  );
}

function Tag({ text, flora }: { text: string; flora?: boolean }) {
  return (
    <Text
      style={{
        backgroundColor: flora ? colors.floraBg : colors.bg,
        color: flora ? colors.flora : colors.text,
        fontFamily: fonts.bodySemi,
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {text}
    </Text>
  );
}

function SourceButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}
