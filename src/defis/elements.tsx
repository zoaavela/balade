import IconLock from '@tabler/icons-react-native/IconLock';
import { StyleSheet, View } from 'react-native';

import { couleurs, trait } from '@/theme';

import type { Defi } from './defis';

// Pas commencé : un cadenas sur crème. En cours : la couleur du défi. Terminé : l'or.
export function IconeDefi({ defi, fait, taille }: { defi: Defi; fait: number; taille: number }) {
  const termine = fait === defi.lieux.length;
  const Icone = fait === 0 ? IconLock : defi.icone;
  const fond = termine ? couleurs.or : fait === 0 ? couleurs.papier : defi.couleur;
  const trace = termine || fait === 0 ? couleurs.encre : couleurs.papier;
  return (
    <View
      style={[
        styles.icone,
        { width: taille, height: taille, borderRadius: taille * 0.22, backgroundColor: fond },
      ]}>
      <Icone size={taille * 0.5} color={trace} strokeWidth={2} />
    </View>
  );
}

export function Barre({ part, couleur }: { part: number; couleur: string }) {
  return (
    <View style={styles.barre}>
      <View style={{ width: `${Math.round(part * 100)}%`, height: '100%', backgroundColor: couleur }} />
    </View>
  );
}

const styles = StyleSheet.create({
  icone: {
    borderWidth: trait,
    borderColor: couleurs.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barre: {
    height: 8,
    borderWidth: 2,
    borderColor: couleurs.encre,
    borderRadius: 6,
    backgroundColor: couleurs.papier,
    overflow: 'hidden',
  },
});
