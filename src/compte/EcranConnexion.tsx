import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { couleurs, espace, polices } from '@/theme';

import { FormulaireConnexion } from './FormulaireConnexion';

// Écran plein affiché quand on n'est pas connecté et que l'accueil a déjà été vu
// (par exemple après « Se déconnecter »). Le compte est obligatoire pour entrer.
export function EcranConnexion() {
  const marges = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.ecran}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          { paddingTop: marges.top + espace.xl, paddingBottom: marges.bottom + espace.l },
        ]}>
        <Text style={styles.titre}>Connexion</Text>
        <Text style={styles.texte}>
          Indique ton adresse e-mail, tu reçois un code pour entrer.
        </Text>
        <FormulaireConnexion />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espace.l,
    gap: espace.m,
  },
  titre: {
    fontFamily: polices.extraGras,
    fontSize: 32,
    lineHeight: 36,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 18,
    lineHeight: 26,
    color: couleurs.encre,
  },
});
