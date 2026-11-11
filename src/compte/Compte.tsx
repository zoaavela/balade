import { StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { useStatutSynchro, type StatutSynchro } from '@/sync/statut';
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
      <Text style={styles.synchro}>{decrireSynchro(useStatutSynchro())}</Text>
      <Bouton titre="Se déconnecter" variante="clair" onPress={() => supabase?.auth.signOut()} />
    </View>
  );
}

function heure(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function decrireSynchro(s: StatutSynchro): string {
  switch (s.etat) {
    case 'jamais':
    case 'en-cours':
      return 'Sauvegarde en cours…';
    case 'ok':
      return `Collection sauvegardée à ${heure(s.le)}.`;
    case 'hors-ligne':
      return s.dernierOk
        ? `Pas de réseau. Dernière sauvegarde à ${heure(s.dernierOk)}, la suite partira plus tard.`
        : 'Pas de réseau. La sauvegarde partira dès que possible.';
  }
}

const styles = StyleSheet.create({
  cadre: {
    gap: espace.m,
    padding: espace.m,
    borderColor: couleurs.encre,
    borderWidth: trait,
    borderRadius: 14,
  },
  synchro: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encreDouce,
  },
  texte: {
    fontFamily: polices.normal,
    fontSize: 16,
    lineHeight: 22,
    color: couleurs.encre,
  },
});
