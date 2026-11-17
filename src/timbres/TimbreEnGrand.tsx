import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { Lieu } from '@/cartes/lieux';
import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices } from '@/theme';

import { Timbre, tailleQuiTient } from './Timbre';

type Props = {
  lieu: Lieu;
  debloqueLe?: Date;
  onFermer: () => void;
  titre?: string; // « Nouveau timbre » quand il vient d'être trouvé
  nouveau?: boolean; // le tampon tombe sur le timbre, avec une vibration légère
  titreBouton?: string;
};

// Un timbre en plein écran, comme sous une loupe : il grossit en arrivant.
// Un toucher le retourne, un autre le remet à l'endroit. Toucher le fond ferme.
export function TimbreEnGrand({ lieu, debloqueLe, onFermer, titre, nouveau = false, titreBouton = 'Fermer' }: Props) {
  const { width, height } = useWindowDimensions();
  const taille = tailleQuiTient(lieu.format, width - espace.xl * 2, height * 0.55);

  const loupe = useSharedValue(0);
  useEffect(() => {
    loupe.value = withSpring(1, { damping: 16, stiffness: 170, mass: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(loupe.value, [0, 0.3], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: 0.35 + loupe.value * 0.65 }],
  }));

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onFermer}>
      <Pressable style={styles.fond} onPress={onFermer} accessibilityLabel="Fermer">
        {titre && <Text style={styles.titre}>{titre}</Text>}
        {/* Le timbre capte ses touchers : seul le fond ferme. */}
        <Animated.View style={style}>
          <Timbre
            lieu={lieu}
            taille={taille}
            debloqueLe={debloqueLe}
            retournable
            enGrand
            obliterationAnimee={nouveau}
            onOblitere={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})}
          />
        </Animated.View>
        <Text style={styles.aide}>Touche le timbre pour le retourner.</Text>
        <View style={styles.bouton}>
          <Bouton titre={titreBouton} onPress={onFermer} variante="clair" />
        </View>
      </Pressable>
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
