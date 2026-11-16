import { StyleSheet, Text, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';

import type { Point } from '@/balade/mesures';
import { categories } from '@/cartes/categories';
import type { LieuPlace } from '@/cartes/lieux';
import { couleurs, polices, trait } from '@/theme';

type Props = {
  lieu: LieuPlace;
  centre: Point;
  rayon_m: number;
  onPress: () => void;
};

const DIAMETRE = 26;

// Un lieu à chercher : une zone pâle à la couleur de la catégorie, en pointillés,
// et un point d'interrogation au milieu. Le nom n'apparaît nulle part.
export function ZoneIndice({ lieu, centre, rayon_m, onPress }: Props) {
  const couleur = categories[lieu.categorie].bordure;
  return (
    <>
      <Circle
        center={centre}
        radius={rayon_m}
        fillColor={`${couleur}2E`} // environ 18 % d'opacité
        strokeColor={couleur}
        strokeWidth={2}
        lineDashPattern={[6, 6]}
      />
      <Marker
        coordinate={centre}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        onPress={onPress}
        accessibilityLabel="Lieu à chercher">
        <View style={styles.cible}>
          <View style={[styles.pastille, { borderColor: couleur }]}>
            <Text style={styles.point}>?</Text>
          </View>
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
  },
  point: {
    fontFamily: polices.extraGras,
    fontSize: 16,
    lineHeight: 19,
    color: couleurs.encre,
  },
});
