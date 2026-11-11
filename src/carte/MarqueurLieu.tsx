import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { categories } from '@/cartes/categories';
import type { Lieu } from '@/cartes/lieux';
import { couleurs, trait } from '@/theme';

type Props = {
  lieu: Lieu;
  debloque: boolean;
  onPress: () => void;
};

const DIAMETRE = 22;

// Pastille ronde à la couleur de la catégorie, contour d'encre.
// Vide (crème) tant que le lieu n'est pas débloqué, pleine ensuite.
export function MarqueurLieu({ lieu, debloque, onPress }: Props) {
  const couleur = categories[lieu.categorie].bordure;
  return (
    <Marker
      // La clé change au déblocage : iOS redessine alors la pastille, pleine.
      key={`${lieu.id}-${debloque}`}
      coordinate={{ latitude: lieu.latitude, longitude: lieu.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
      accessibilityLabel={lieu.nom}>
      <View style={styles.cible}>
        <View
          style={[styles.pastille, { backgroundColor: debloque ? couleur : couleurs.fond }]}>
          {/* Vide : un anneau de couleur garde la catégorie visible, le centre reste crème. */}
          {!debloque && <View style={[styles.anneau, { borderColor: couleur }]} />}
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  // Zone de tap un peu plus grande que la pastille.
  cible: {
    width: DIAMETRE + 14,
    height: DIAMETRE + 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastille: {
    width: DIAMETRE,
    height: DIAMETRE,
    borderRadius: DIAMETRE / 2,
    borderWidth: trait,
    borderColor: couleurs.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anneau: {
    width: DIAMETRE - trait * 2,
    height: DIAMETRE - trait * 2,
    borderRadius: (DIAMETRE - trait * 2) / 2,
    borderWidth: 3,
  },
});
