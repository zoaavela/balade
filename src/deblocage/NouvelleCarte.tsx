import * as Haptics from 'expo-haptics';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Carte } from '@/cartes/Carte';
import type { Lieu } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices } from '@/theme';

type Props = {
  lieu: Lieu;
  date: Date;
  encoreApres: number; // nombre de cartes qui attendent derrière celle-ci
  onFermer: () => void;
};

// Plein écran sur fond assombri : la carte arrive face cachée puis se retourne.
export function NouvelleCarte({ lieu, date, encoreApres, onFermer }: Props) {
  const { width } = useWindowDimensions();
  const taille = Math.min(width - espace.xl * 2, 320);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onFermer}>
      <View style={styles.fond}>
        <Text style={styles.titre}>Nouvelle carte</Text>
        <Carte
          lieu={lieu}
          taille={taille}
          debloqueLe={date}
          revelation
          onRevele={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        />
        <View style={styles.bouton}>
          <Bouton
            titre={encoreApres > 0 ? 'Carte suivante' : 'Fermer'}
            onPress={onFermer}
            variante="clair"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: 'rgba(33, 29, 26, 0.85)', // l'encre, en voile
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.l,
    padding: espace.l,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 30,
    color: couleurs.fond,
  },
  bouton: {
    alignSelf: 'stretch',
    marginTop: espace.s,
  },
});
