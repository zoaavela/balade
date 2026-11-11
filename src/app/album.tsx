import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { Ecran } from '@/components/ecran';
import { Carte } from '@/cartes/Carte';
import { lieux } from '@/cartes/lieux';
import { useDeblocage } from '@/deblocage/Deblocage';
import { couleurs, espace, polices } from '@/theme';

export default function Album() {
  const { width } = useWindowDimensions();
  const taille = Math.min(width - espace.m * 2 - 4, 340);
  const { debloquees } = useDeblocage();

  return (
    <Ecran titre="Album">
      <ScrollView contentContainerStyle={styles.liste} showsVerticalScrollIndicator={false}>
        <Text style={styles.aide}>Touche une carte pour la retourner.</Text>
        {lieux.map((lieu) => (
          <Carte key={lieu.id} lieu={lieu} taille={taille} debloqueLe={debloquees.get(lieu.id)} />
        ))}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  liste: {
    alignItems: 'center',
    gap: espace.l,
    paddingTop: espace.s,
    paddingBottom: espace.xl,
  },
  aide: {
    alignSelf: 'flex-start',
    fontFamily: polices.normal,
    fontSize: 15,
    color: couleurs.encreDouce,
  },
});
