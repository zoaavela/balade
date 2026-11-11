import { Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, espace, polices, trait } from '@/theme';

type Props = {
  titre: string;
  onPress: () => void;
  variante?: 'encre' | 'clair'; // clair : pour poser le bouton sur un fond sombre
};

// Bouton principal : aplat d'encre et texte crème, ou l'inverse en variante claire.
export function Bouton({ titre, onPress, variante = 'encre' }: Props) {
  const clair = variante === 'clair';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.bouton, clair && styles.boutonClair, pressed && styles.appuye]}>
      <Text style={[styles.texte, clair && styles.texteClair]}>{titre}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    backgroundColor: couleurs.encre,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    alignItems: 'center',
  },
  boutonClair: {
    backgroundColor: couleurs.fond,
  },
  appuye: {
    opacity: 0.8,
  },
  texte: {
    fontFamily: polices.gras,
    fontSize: 17,
    color: couleurs.fond,
  },
  texteClair: {
    color: couleurs.encre,
  },
});
