import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, PixelRatio, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { CARD_HEIGHT, CARD_WIDTH, cardTastes, PlantCard, type PlantCardShow } from '@/PlantCard';
import { plantCard } from '@/selectors';
import { useStore } from '@/store';
import { colors, radius } from '@/theme';
import { Body, Chip, IconButton, Label, PrimaryButton, Title } from '@/ui';

const THUMB = 56;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function CromoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const plant = s.plants.find((p) => p.id === id);
  const data = plant ? plantCard(s, plant) : undefined;

  // Estado de la vista previa (no es dominio): foto elegida, bloques visibles y carga.
  const [photoId, setPhotoId] = useState<string | undefined>();
  const [show, setShow] = useState<PlantCardShow>({ harvest: true, cannabinoids: true, tastes: true });
  const [loadedUri, setLoadedUri] = useState<string | undefined>();
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  // `busy` llega al closure recién en el próximo render: el ref frena el doble tap dentro del mismo frame.
  const sharing = useRef(false);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  if (!plant || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <IconButton icon="close" label="Cerrar" onPress={close} />
        <Title style={{ marginTop: 20 }}>No encontré esa planta</Title>
        <Body style={{ marginTop: 8, color: colors.textSoft }}>Puede que ya no exista. Volvé a la carpa y elegí otra.</Body>
      </SafeAreaView>
    );
  }

  const photo = data.photos.find((p) => p.id === photoId) ?? data.cover ?? data.photos[0];
  // Sin foto no hay nada que esperar; con foto, recién se captura cuando terminó de cargar.
  const ready = !photo || loadedUri === photo.uri;

  const g = data.genetic;
  const hasHarvest = data.floraRemaining != null && !!g?.floweringDays;
  const hasCannabinoids = !!(g?.thc?.trim() || g?.cbd?.trim());
  const hasTastes = !!g && cardTastes(g.flavors, g.effects).length > 0;
  const toggles: { key: keyof PlantCardShow; label: string }[] = [
    ...(hasHarvest ? [{ key: 'harvest' as const, label: 'Cosecha' }] : []),
    ...(hasCannabinoids ? [{ key: 'cannabinoids' as const, label: 'THC / CBD' }] : []),
    ...(hasTastes ? [{ key: 'tastes' as const, label: 'Sabores y efectos' }] : []),
  ];

  const scale = area.w && area.h ? Math.min(area.w / CARD_WIDTH, area.h / CARD_HEIGHT) : 0;

  const share = async () => {
    if (!ready || sharing.current) return;
    sharing.current = true;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No se puede compartir', 'Este dispositivo no permite compartir imágenes desde la app.');
        return;
      }
      // Siempre 1080x1920 px. En Android width/height van en píxeles; en iOS van en puntos y se multiplican
      // por la escala de la pantalla (360x640 en un iPhone 3x, 540x960 en uno 2x).
      const ratio = Platform.OS === 'ios' ? PixelRatio.get() : 1;
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080 / ratio,
        height: 1920 / ratio,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Cromo de ${plant.name}` });
    } catch {
      Alert.alert('No pude armar el cromo', 'Probá de nuevo en un ratito. Si sigue fallando, elegí otra foto.');
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title numberOfLines={1} style={{ flexShrink: 1, marginRight: 8 }}>
            Cromo de {plant.name}
          </Title>
          <IconButton icon="close" label="Cerrar" onPress={close} />
        </View>

        {/* Vista previa: la tarjeta va a tamaño real (360x640) y se achica con un transform en el padre. */}
        <View
          style={{ flex: 1, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}
          onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {scale > 0 ? (
            <View
              style={{
                width: CARD_WIDTH * scale,
                height: CARD_HEIGHT * scale,
                borderRadius: radius.md,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  left: (CARD_WIDTH * scale - CARD_WIDTH) / 2,
                  top: (CARD_HEIGHT * scale - CARD_HEIGHT) / 2,
                  transform: [{ scale }],
                }}
              >
                {/* Esta es la vista que se captura: sin transform propio, a tamaño lógico. */}
                <View ref={cardRef} collapsable={false} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                  <PlantCard data={data} photo={photo} show={show} onImageLoad={() => setLoadedUri(photo?.uri)} />
                </View>
              </View>
              {!ready ? (
                <View
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
                >
                  <ActivityIndicator color={colors.lime} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {data.photos.length > 1 ? (
          <View style={{ marginTop: 14 }}>
            <Label style={{ marginBottom: 8 }}>Foto</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {data.photos.map((p) => {
                const on = p.id === photo?.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPhotoId(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Usar esta foto en el cromo"
                    accessibilityState={{ selected: on }}
                    style={{
                      width: THUMB,
                      height: THUMB,
                      borderRadius: radius.sm,
                      borderWidth: 2,
                      borderColor: on ? colors.lime : 'transparent',
                      padding: 2,
                    }}
                  >
                    <Image source={{ uri: p.uri }} style={{ flex: 1, borderRadius: radius.sm - 4, backgroundColor: colors.card }} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {toggles.length ? (
          <View style={{ marginTop: 14 }}>
            <Label style={{ marginBottom: 8 }}>Mostrar</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {toggles.map((t) => (
                <Chip key={t.key} label={t.label} active={show[t.key]} onPress={() => setShow((v) => ({ ...v, [t.key]: !v[t.key] }))} />
              ))}
            </View>
          </View>
        ) : null}

        <PrimaryButton
          label={busy ? 'Armando el cromo…' : ready ? 'Compartir' : 'Cargando foto…'}
          icon={ready && !busy ? 'share-outline' : undefined}
          disabled={!ready || busy}
          onPress={share}
          style={{ marginTop: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}
