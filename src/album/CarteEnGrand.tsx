import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Carte } from '@/cartes/Carte';
import type { Lieu } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices } from '@/theme';

type Props = {
  lieu: Lieu;
  debloqueLe?: Date;
  onFermer: () => void;
};

// Une carte de l'album en grand, sur un voile d'encre. Un tap la retourne.
export function CarteEnGrand({ lieu, debloqueLe, onFermer }: Props) {
  const { width } = useWindowDimensions();
  const taille = Math.min(width - espace.xl * 2, 340);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onFermer}>
      <View style={styles.fond}>
        <Carte lieu={lieu} taille={taille} debloqueLe={debloqueLe} />
        <Text style={styles.aide}>Touche la carte pour la retourner.</Text>
        <View style={styles.bouton}>
          <Bouton titre="Fermer" onPress={onFermer} variante="clair" />
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
  aide: {
    fontFamily: polices.normal,
    fontSize: 15,
    color: couleurs.fond,
    opacity: 0.8,
  },
  bouton: {
    alignSelf: 'stretch',
  },
});
