import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, espace, polices } from '@/theme';

type Props = {
  titre: string;
  children?: ReactNode;
  onAppuiLongTitre?: () => void;
  droite?: ReactNode; // à droite du titre, par exemple l'icône réglages du profil
};

// Cadre commun à tous les écrans : fond crème, grand titre en haut.
export function Ecran({ titre, children, onAppuiLongTitre, droite }: Props) {
  const marges = useSafeAreaInsets();
  return (
    <View style={[styles.ecran, { paddingTop: marges.top + espace.m }]}>
      <View style={styles.haut}>
        <Text style={styles.titre} onLongPress={onAppuiLongTitre} suppressHighlighting>
          {titre}
        </Text>
        {droite}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
    paddingHorizontal: espace.m,
  },
  haut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 34,
    color: couleurs.encre,
  },
});
