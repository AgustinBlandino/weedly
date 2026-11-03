import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: footer ? 120 : 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 20 }}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Title({ children, size = 30, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ fontFamily: fonts.display, fontSize: size, color: colors.text, letterSpacing: -0.5 }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: fonts.displaySemi, fontSize: 19, color: colors.text }, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.body, fontSize: 14, color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 }, style]}>{children}</View>;
}

export function Chip({
  label,
  tone = 'neutral',
  onPress,
  active,
}: {
  label: string;
  tone?: 'neutral' | 'flora' | 'vege' | 'lime';
  onPress?: () => void;
  active?: boolean;
}) {
  const bg = active
    ? colors.lime
    : tone === 'flora'
      ? colors.floraBg
      : tone === 'vege'
        ? '#22351F'
        : tone === 'lime'
          ? colors.lime
          : colors.card;
  const fg = active || tone === 'lime' ? colors.bg : tone === 'flora' ? colors.flora : tone === 'vege' ? colors.vege : colors.textSoft;
  const content = (
    <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }}>
      <Text style={{ color: fg, fontFamily: active ? fonts.bodySemi : fonts.body, fontSize: 13 }}>{label}</Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} hitSlop={6}>
      {content}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: radius.md,
          backgroundColor: disabled ? colors.border : colors.lime,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.bg} /> : null}
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: disabled ? colors.muted : colors.bg }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  bg = colors.card,
  color = colors.text,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  bg?: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2.6,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Muted style={{ fontSize: 13 }}>{label}</Muted>
      <TextInput
        placeholderTextColor="#7F897C"
        {...props}
        style={{
          minHeight: props.multiline ? 92 : 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardAlt,
          color: colors.text,
          paddingHorizontal: 14,
          paddingVertical: props.multiline ? 12 : 0,
          fontFamily: fonts.body,
          fontSize: 15,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, bounciness: 8 }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: value ? colors.lime : colors.border }}
    >
      <Animated.View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: value ? colors.bg : colors.textSoft,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }}
      />
    </Pressable>
  );
}

/** Entrada con profundidad: aparece desde atrás con un leve giro en X */
export function Rise({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        {
          opacity: v,
          transform: [
            { perspective: 900 },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
            { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['22deg', '0deg'] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 10 }}>
      <H2>{title}</H2>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={{ color: colors.lime, fontFamily: fonts.bodySemi, fontSize: 13 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A524A', borderRadius: radius.md, padding: 16 }}>
      <Muted style={{ fontSize: 13, color: colors.textSoft }}>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    gap: 10,
  },
});
