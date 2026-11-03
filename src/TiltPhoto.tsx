import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, radius } from './theme';

/** Foto con un balanceo 3D suave en perspectiva. Sin foto, muestra un recuadro para cargarla. */
export function TiltPhoto({
  uri,
  height = 240,
  emptyLabel = 'Sin foto todavía',
  children,
  style,
}: {
  uri?: string;
  height?: number;
  emptyLabel?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: radius.xl,
          backgroundColor: uri ? '#000' : colors.cardAlt,
          borderWidth: uri ? 0 : 1,
          borderStyle: 'dashed',
          borderColor: '#4A524A',
          overflow: 'hidden',
          transform: [
            { perspective: 900 },
            { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] }) },
            { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['4deg', '-3deg'] }) },
          ],
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 60 }}>
          <Ionicons name="camera-outline" size={28} color={colors.textSoft} />
          <Text style={{ color: colors.textSoft, fontFamily: fonts.bodySemi, fontSize: 13 }}>{emptyLabel}</Text>
        </View>
      )}
      {children}
    </Animated.View>
  );
}
