import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { catalogByBrand, fertilizerInfo } from '@/selectors';
import type { CatalogShelfProduct } from '@/selectors';
import { useStore } from '@/store';
import { colors, radius, typo } from '@/theme';
import { Card, H3, IconButton, Muted, PrimaryButton, Rise, Screen, Title } from '@/ui';

export default function CatalogoScreen() {
  const s = useStore();
  const packs = catalogByBrand(s);
  // Selección de la pantalla: no es estado de dominio, se descarta al cerrar.
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const add = () => {
    s.addFromCatalog(selected);
    router.back();
  };

  // Reemplaza el catálogo por el formulario: al guardar se vuelve a donde se abrió el catálogo
  // (riego o biblioteca), no al catálogo. Lo que ya estaba marcado se suma para no perderlo.
  const loadCustom = () => {
    if (selected.length) s.addFromCatalog(selected);
    router.replace('/fertilizante/nuevo');
  };

  const n = selected.length;

  return (
    <Screen
      footer={
        <PrimaryButton
          label={n === 0 ? 'Elegí productos' : `Agregar ${n} ${n === 1 ? 'producto' : 'productos'}`}
          disabled={n === 0}
          onPress={add}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Title>Catálogo</Title>
          <Muted>Sumá a tu estante los productos que usás.</Muted>
        </View>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'flex-start',
          marginTop: 14,
          padding: 12,
          borderRadius: radius.sm,
          backgroundColor: colors.cardAlt,
        }}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.muted} style={{ marginTop: 1 }} />
        <Muted style={{ flex: 1 }}>Las dosis son las de la etiqueta; verificalas en el envase.</Muted>
      </View>

      {packs.map((pack, i) => {
        const packIds = pack.products.filter((p) => !p.onShelf).map((p) => p.id);
        const allPicked = packIds.length > 0 && packIds.every((id) => selected.includes(id));
        const togglePack = () =>
          setSelected((cur) =>
            allPicked ? cur.filter((id) => !packIds.includes(id)) : [...new Set([...cur, ...packIds])],
          );
        return (
          <Rise key={pack.id} delay={40 + i * 50} style={{ marginTop: 16 }}>
            <Card style={{ gap: 4, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <H3>{pack.brand}</H3>
                </View>
              </View>
              {packIds.length ? (
                <Pressable
                  onPress={togglePack}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', marginTop: 4 }}
                >
                  <Text style={{ ...typo.labelStrong, color: colors.lime }}>
                    {allPicked ? 'Quitar todos' : 'Elegir todos'}
                  </Text>
                </Pressable>
              ) : null}
              <View style={{ marginTop: 4 }}>
                {pack.products.map((p, j) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    checked={selected.includes(p.id)}
                    first={j === 0}
                    onPress={() => toggle(p.id)}
                  />
                ))}
              </View>
            </Card>
          </Rise>
        );
      })}

      <Rise delay={40 + packs.length * 50} style={{ marginTop: 16 }}>
        <Pressable
          onPress={loadCustom}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 56,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="create-outline" size={20} color={colors.lime} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...typo.bodyStrong, color: colors.text }}>¿No está el tuyo?</Text>
            <Muted>Cargalo vos: nombre, fase y NPK si lo sabés.</Muted>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </Rise>
    </Screen>
  );
}

function ProductRow({
  product: p,
  checked,
  first,
  onPress,
}: {
  product: CatalogShelfProduct;
  checked: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const meta = fertilizerInfo(p);
  const on = checked || p.onShelf;
  return (
    <Pressable
      onPress={onPress}
      disabled={p.onShelf}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: p.onShelf }}
      accessibilityLabel={p.onShelf ? `${p.name}, en tu estante` : p.name}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 12,
        minHeight: 56,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        opacity: p.onShelf ? 0.6 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={p.onShelf ? 'checkmark-circle' : checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={p.onShelf ? colors.muted : checked ? colors.lime : colors.textSoft}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ ...typo.bodyStrong, color: colors.text }}>{p.name}</Text>
          {p.onShelf ? (
            <View style={{ backgroundColor: colors.limeBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ ...typo.badge, color: colors.lime }}>En tu estante</Text>
            </View>
          ) : null}
        </View>
        <Muted>{meta}</Muted>
      </View>
    </Pressable>
  );
}
