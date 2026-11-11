import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, espace, polices } from '@/theme';

type Props = {
  titre: string;
  children?: ReactNode;
  onAppuiLongTitre?: () => void;
};

// Cadre commun à tous les écrans : fond crème, grand titre en haut.
export function Ecran({ titre, children, onAppuiLongTitre }: Props) {
  const marges = useSafeAreaInsets();
  return (
    <View style={[styles.ecran, { paddingTop: marges.top + espace.m }]}>
      <Text style={styles.titre} onLongPress={onAppuiLongTitre} suppressHighlighting>
        {titre}
      </Text>
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
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 34,
    color: couleurs.encre,
  },
});
