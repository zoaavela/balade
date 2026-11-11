import { Pressable, StyleSheet, Text } from 'react-native';

import { couleurs, espace, polices, trait } from '@/theme';

type Props = {
  titre: string;
  onPress: () => void;
};

// Bouton principal : aplat d'encre, texte crème.
export function Bouton({ titre, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.bouton, pressed && styles.appuye]}>
      <Text style={styles.texte}>{titre}</Text>
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
  appuye: {
    opacity: 0.8,
  },
  texte: {
    fontFamily: polices.gras,
    fontSize: 17,
    color: couleurs.fond,
  },
});
