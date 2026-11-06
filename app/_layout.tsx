import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHydrationStatus } from '@/store';
import { colors } from '@/theme';
import { Body, Screen, Title } from '@/ui';

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydration = useHydrationStatus();

  if (!loaded || hydration === 'pending') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  // Sin datos cargados no se entra a la app: usar el store podría pisar lo guardado.
  if (hydration === 'error') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Screen scroll={false}>
          <View accessible accessibilityRole="alert" style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
            <Title>No pude leer tus datos</Title>
            <Body style={{ color: colors.textSoft }}>
              No se tocó nada de lo que tenías guardado. Conviene que cierres la app y la vuelvas a abrir.
            </Body>
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="planta/[id]" />
        <Stack.Screen name="editar-planta/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="riego" options={{ presentation: 'modal' }} />
        <Stack.Screen name="foto" options={{ presentation: 'modal' }} />
        <Stack.Screen name="clima" options={{ presentation: 'modal' }} />
        <Stack.Screen name="genetica/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="receta/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="fertilizante/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
