import { StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices, trait } from '@/theme';

import { supabase } from './supabase';
import { useSession } from './useSession';

// Section « Compte » du Profil. On y arrive forcément connecté :
// sans compte, l'app affiche l'écran de connexion à la place des onglets.
export function Compte() {
  const { session } = useSession();

  return (
    <View style={styles.cadre}>
      <Text style={styles.texte}>
        {session?.user.email ? `Connecté avec ${session.user.email}` : 'Connecté'}
      </Text>
      <Bouton titre="Se déconnecter" variante="clair" onPress={() => supabase?.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    gap: espace.m,
    padding: espace.m,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encre,
  },
});
