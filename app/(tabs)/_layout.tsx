import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: '#171A17', borderTopColor: '#262B26', height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Carpa', tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="diario"
        options={{ title: 'Diario', tabBarIcon: ({ color }) => <Ionicons name="reader-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="biblioteca"
        options={{ title: 'Biblioteca', tabBarIcon: ({ color }) => <Ionicons name="library-outline" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
