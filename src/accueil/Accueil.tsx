import * as Location from 'expo-location';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Carte } from '@/cartes/Carte';
import { lieux } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { FormulaireConnexion } from '@/compte/FormulaireConnexion';
import { couleurs, espace, polices } from '@/theme';

import { dansExpoGo } from '@/suivi/environnement';
import { demanderNotifications } from '@/suivi/notifications';

import { marquerAccueilVu } from './accueilVu';

type Etape = {
  titre: string;
  texte: string;
  visuel?: ReactNode;
};

const explications: Etape[] = [
  {
    titre: 'Tes trajets deviennent une collection',
    texte:
      "Tu te déplaces en Île-de-France, l'app enregistre ton chemin. Passe près d'un lieu et tu débloques sa carte.",
    visuel: <Carte lieu={lieux[0]} taille={190} />,
  },
  {
    titre: 'Le suivi est automatique',
    texte: dansExpoGo
      ? "Aucun bouton à toucher : dès que l'app est ouverte, elle note ta position toute seule, à peu près tous les 15 mètres. Pour l'instant, elle doit rester ouverte pour enregistrer."
      : "Aucun bouton à toucher : l'app note ta position toute seule, même téléphone en poche. Pour économiser la batterie, le GPS précis ne s'allume que quand tu marches.",
  },
  {
    titre: 'Tes positions restent à toi',
    texte:
      "Elles sont rangées sur ton téléphone et sauvegardées sur ton compte, pour les retrouver si tu changes de téléphone. Toi seul peux les voir. Les autres ne verront jamais ton tracé.",
  },
];

// Écrans du premier lancement : trois explications, la connexion, puis la localisation.
// Si on est déjà connecté (accueil revu, ou app fermée en cours de route),
// l'étape de connexion est sautée.
export function Accueil({ connecte }: { connecte: boolean }) {
  const [index, setIndex] = useState(0);
  const marges = useSafeAreaInsets();
  const nbEtapes = explications.length + 2; // + connexion + localisation
  const surConnexion = index === explications.length;
  const surLocalisation = index === explications.length + 1;

  // Dès que la connexion réussit, on passe à la localisation.
  useEffect(() => {
    if (connecte && surConnexion) setIndex(explications.length + 1);
  }, [connecte, surConnexion]);

  function continuer() {
    const suivant = index + 1;
    // Déjà connecté : pas besoin de l'écran de connexion.
    setIndex(suivant === explications.length && connecte ? suivant + 1 : suivant);
  }

  async function autoriser() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // Dans la build, on demande ensuite « Toujours » pour suivre téléphone en poche.
      if (status === 'granted' && !dansExpoGo) {
        await Location.requestBackgroundPermissionsAsync();
        await demanderNotifications();
      }
    } finally {
      // Accepté ou refusé, l'app s'ouvre. En cas de refus, l'onglet Carte explique
      // comment activer la localisation dans les réglages.
      marquerAccueilVu(true);
    }
  }

  let contenu: ReactNode;
  if (surConnexion) {
    contenu = (
      <>
        <Text style={styles.titre}>Ton compte</Text>
        <Text style={styles.texte}>
          Indique ton adresse e-mail, tu reçois un code pour entrer. La première fois, ça crée ton
          compte.
        </Text>
        <FormulaireConnexion />
      </>
    );
  } else if (surLocalisation) {
    contenu = (
      <>
        <Text style={styles.titre}>Où es-tu ?</Text>
        <Text style={styles.texte}>
          {dansExpoGo
            ? "Dernière étape : l'app a besoin de ta position pendant que tu l'utilises, pour enregistrer tes trajets et débloquer les lieux où tu passes."
            : "Dernière étape : l'app a besoin de ta position, puis de ton accord pour la lire « Toujours », afin d'enregistrer tes trajets même téléphone en poche. Elle te demandera aussi de t'envoyer une notification quand tu débloques une carte."}
        </Text>
      </>
    );
  } else {
    const etape = explications[index];
    contenu = (
      <>
        {etape.visuel && <View style={styles.visuel}>{etape.visuel}</View>}
        <Text style={styles.titre}>{etape.titre}</Text>
        <Text style={styles.texte}>{etape.texte}</Text>
      </>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.ecran}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          { paddingTop: marges.top + espace.xl, paddingBottom: marges.bottom + espace.l },
        ]}>
        <View style={styles.contenu}>{contenu}</View>

        <View style={styles.points}>
          {Array.from({ length: nbEtapes }, (_, i) => (
            <View key={i} style={[styles.point, i === index && styles.pointActif]} />
          ))}
        </View>

        {/* Sur l'écran de connexion, c'est le formulaire qui fait avancer. */}
        {!surConnexion && (
          <Bouton
            titre={surLocalisation ? 'Autoriser la localisation' : 'Continuer'}
            onPress={surLocalisation ? autoriser : continuer}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  page: {
    flexGrow: 1,
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
