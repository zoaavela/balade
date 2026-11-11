import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import Tabs from 'expo-router/js-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';

import { ouvrirBase } from '@/db/base';
import { couleurs, polices, trait } from '@/theme';

SplashScreen.preventAutoHideAsync();
ouvrirBase(); // crée les tables au premier lancement

// Icônes système iOS en attendant nos propres pictos.
function icone(nom: SymbolViewProps['name']) {
  return ({ color }: { color: SymbolViewProps['tintColor'] }) => (
    <SymbolView name={nom} tintColor={color} size={24} />
  );
}

export default function RootLayout() {
  const [policesPretes] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (policesPretes) SplashScreen.hideAsync();
  }, [policesPretes]);

  if (!policesPretes) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: couleurs.fond },
          tabBarActiveTintColor: couleurs.encre,
          tabBarInactiveTintColor: couleurs.encreDouce,
          tabBarStyle: {
            backgroundColor: couleurs.fond,
            borderTopColor: couleurs.encre,
            borderTopWidth: trait,
          },
          tabBarLabelStyle: { fontFamily: polices.moyen, fontSize: 12 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Carte', tabBarIcon: icone('map') }} />
        <Tabs.Screen name="album" options={{ title: 'Album', tabBarIcon: icone('square.stack') }} />
        <Tabs.Screen name="defis" options={{ title: 'Défis', tabBarIcon: icone('flag') }} />
        <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icone('person') }} />
      </Tabs>
    </>
  );
}
