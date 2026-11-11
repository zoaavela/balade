import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CarteEnGrand } from '@/album/CarteEnGrand';
import { formaterDistance } from '@/balade/mesures';
import { Carte } from '@/cartes/Carte';
import { lieux, type Lieu } from '@/cartes/lieux';
import { Ecran } from '@/components/ecran';
import { tousLesPoints } from '@/db/points';
import { useDeblocage } from '@/deblocage/Deblocage';
import { distanceTotale } from '@/profil/statistiques';
import { couleurs, espace, polices, trait } from '@/theme';

const NB_DERNIERES = 3;
const ECART = 10;
const TRANCHE = 4; // épaisseur du carton, dessinée en plus de la carte

const MOIS_COURTS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export default function Profil() {
  const { width } = useWindowDimensions();
  const { debloquees } = useDeblocage();
  const [metres, setMetres] = useState(0);
  const [enGrand, setEnGrand] = useState<Lieu | null>(null);

  // Recalculé à chaque ouverture de l'onglet, pour suivre les nouveaux points.
  useFocusEffect(
    useCallback(() => {
      setMetres(distanceTotale(tousLesPoints()));
    }, []),
  );

  const dernieres = lieux
    .filter((lieu) => debloquees.has(lieu.id))
    .sort((a, b) => debloquees.get(b.id)!.getTime() - debloquees.get(a.id)!.getTime())
    .slice(0, NB_DERNIERES);
  const taille = Math.floor((width - espace.m * 2 - ECART * (NB_DERNIERES - 1)) / NB_DERNIERES) - TRANCHE;

  return (
    <Ecran titre="Profil">
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <View style={styles.rangee}>
          <Chiffre valeur={`${debloquees.size} / ${lieux.length}`} legende="Cartes" />
          <Chiffre valeur={formaterDistance(metres)} legende="Parcourus" />
        </View>
        <View style={styles.rangee}>
          <Chiffre valeur="Bientôt" legende="Pas aujourd'hui" attente />
          <Chiffre valeur="Bientôt" legende="Pas au total" attente />
        </View>

        <Text style={styles.sousTitre}>Dernières cartes</Text>
        {dernieres.length === 0 ? (
          <Text style={styles.vide}>
            Aucune carte pour l'instant. Passe près d'un lieu pour débloquer la première.
          </Text>
        ) : (
          <View style={styles.cartes}>
            {dernieres.map((lieu) => (
              <View key={lieu.id} style={styles.carte}>
                <Carte
                  lieu={lieu}
                  taille={taille}
                  debloqueLe={debloquees.get(lieu.id)}
                  onPress={() => setEnGrand(lieu)}
                />
                <Text style={styles.date}>{formaterDateCourte(debloquees.get(lieu.id)!)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {enGrand && (
        <CarteEnGrand
          lieu={enGrand}
          debloqueLe={debloquees.get(enGrand.id)}
          onFermer={() => setEnGrand(null)}
        />
      )}
    </Ecran>
  );
}

// Une case : un grand chiffre et sa légende.
function Chiffre(props: { valeur: string; legende: string; attente?: boolean }) {
  return (
    <View style={styles.case}>
      <Text
        style={[styles.valeur, props.attente && styles.valeurAttente]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {props.valeur}
      </Text>
      <Text style={styles.legende}>{props.legende}</Text>
    </View>
  );
}

// « 12 nov. »
function formaterDateCourte(d: Date): string {
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  contenu: {
    gap: espace.m,
    paddingTop: espace.m,
    paddingBottom: espace.xl,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  case: {
    flex: 1,
    padding: espace.m,
    backgroundColor: couleurs.fond,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  valeur: {
    fontFamily: polices.extraGras,
    fontSize: 30,
    color: couleurs.encre,
    fontVariant: ['tabular-nums'],
  },
  valeurAttente: {
    color: couleurs.encreDouce,
  },
  legende: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encreDouce,
  },
  sousTitre: {
    fontFamily: polices.extraGras,
    fontSize: 22,
    color: couleurs.encre,
    marginTop: espace.s,
  },
  vide: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encreDouce,
  },
  cartes: {
    flexDirection: 'row',
    gap: ECART,
  },
  carte: {
    gap: espace.xs,
    alignItems: 'center',
  },
  date: {
    fontFamily: polices.moyen,
    fontSize: 13,
    color: couleurs.encreDouce,
  },
});
