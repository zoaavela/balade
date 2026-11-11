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

import { Accueil } from '@/accueil/Accueil';
import { useAccueilVu } from '@/accueil/accueilVu';
import { EcranConnexion } from '@/compte/EcranConnexion';
import { useSession } from '@/compte/useSession';
import { ouvrirBase } from '@/db/base';
import { DeblocageProvider } from '@/deblocage/Deblocage';
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

  const accueilVu = useAccueilVu();
  const { session, chargee } = useSession();
  const pret = policesPretes && chargee;

  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);

  // L'écran de démarrage reste affiché le temps de charger la police et la session.
  if (!pret) return null;

  // Premier lancement : l'accueil passe avant tout le reste, connexion comprise.
  if (!accueilVu) {
    return (
      <>
        <StatusBar style="dark" />
        <Accueil connecte={session !== null} />
      </>
    );
  }

  // Le compte est obligatoire : sans session, pas d'accès à l'app.
  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <EcranConnexion />
      </>
    );
  }

  return (
    <DeblocageProvider>
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
    </DeblocageProvider>
  );
}
