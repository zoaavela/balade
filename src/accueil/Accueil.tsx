import * as Location from 'expo-location';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Carte } from '@/cartes/Carte';
import { lieux } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices } from '@/theme';

import { marquerAccueilVu } from './accueilVu';

type Etape = {
  titre: string;
  texte: string;
  visuel?: ReactNode;
};

const etapes: Etape[] = [
  {
    titre: 'Tes trajets deviennent une collection',
    texte:
      "Tu te déplaces en Île-de-France, l'app enregistre ton chemin. Passe près d'un lieu et tu débloques sa carte.",
    visuel: <Carte lieu={lieux[0]} taille={190} />,
  },
  {
    titre: 'Le suivi est automatique',
    texte:
      "Aucun bouton à toucher : dès que l'app est ouverte, elle note ta position toute seule, à peu près tous les 15 mètres. Pour l'instant, elle doit rester ouverte pour enregistrer.",
  },
  {
    titre: 'Tes positions restent chez toi',
    texte:
      "Elles sont rangées sur ton téléphone, dans l'app, et ne sont envoyées nulle part. Il faut seulement ton accord pour lire ta position pendant que tu utilises l'app.",
  },
];

// Accueil du tout premier lancement : trois écrans, puis la demande de localisation.
// Un refus mène quand même à l'app : l'onglet Carte affiche alors l'écran qui explique
// comment activer la localisation dans les réglages.
export function Accueil() {
  const [index, setIndex] = useState(0);
  const marges = useSafeAreaInsets();
  const etape = etapes[index];
  const derniere = index === etapes.length - 1;

  async function autoriser() {
    try {
      await Location.requestForegroundPermissionsAsync();
    } finally {
      marquerAccueilVu(true);
    }
  }

  return (
    <View
      style={[
        styles.ecran,
        { paddingTop: marges.top + espace.xl, paddingBottom: marges.bottom + espace.l },
      ]}>
      <View style={styles.contenu}>
        {etape.visuel && <View style={styles.visuel}>{etape.visuel}</View>}
        <Text style={styles.titre}>{etape.titre}</Text>
        <Text style={styles.texte}>{etape.texte}</Text>
      </View>

      <View style={styles.points}>
        {etapes.map((_, i) => (
          <View key={i} style={[styles.point, i === index && styles.pointActif]} />
        ))}
      </View>

      <Bouton
        titre={derniere ? 'Autoriser la localisation' : 'Continuer'}
        onPress={derniere ? autoriser : () => setIndex(index + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
    paddingHorizontal: espace.l,
    gap: espace.l,
  },
  contenu: {
    flex: 1,
    justifyContent: 'center',
    gap: espace.m,
  },
  visuel: {
    alignItems: 'center',
    marginBottom: espace.l,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 32,
    lineHeight: 36,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 18,
    lineHeight: 26,
    color: couleurs.encre,
  },
  points: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espace.s,
  },
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: couleurs.encre,
  },
  pointActif: {
    backgroundColor: couleurs.encre,
  },
});
