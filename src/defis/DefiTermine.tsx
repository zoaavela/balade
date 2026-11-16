import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { couleurs, espace, polices, trait } from '@/theme';

import type { Defi } from './defis';

type Props = {
  defi: Defi;
  encoreApres: number;
  onFermer: () => void;
};

// Plein écran, comme une nouvelle carte : l'icône du défi passe en or.
// Le timbre spécial du T24 viendra se poser ici.
export function DefiTermine({ defi, encoreApres, onFermer }: Props) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);
  const Icone = defi.icone;
  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onFermer}>
      <View style={styles.fond}>
        <Text style={styles.titre}>Défi terminé</Text>
        <View style={styles.icone}>
          <Icone size={84} color={couleurs.encre} strokeWidth={1.8} />
        </View>
        <Text style={styles.nom}>{defi.titre}</Text>
        <Text style={styles.texte}>{gain(defi)}</Text>
        <View style={styles.bouton}>
          <Bouton titre={encoreApres > 0 ? 'Suivant' : 'Fermer'} onPress={onFermer} variante="clair" />
        </View>
      </View>
    </Modal>
  );
}

function gain(d: Defi): string {
  const n = d.lieux.length;
  if (d.revele.length === 1) return `${n} / ${n}. Un lieu secret vient d'apparaître sur la carte.`;
  if (d.revele.length > 1) return `${n} / ${n}. ${d.revele.length} lieux secrets viennent d'apparaître sur la carte.`;
  if (d.timbreSpecial) return `${n} / ${n}. Tu gagnes un timbre spécial.`;
  return `${n} / ${n}. Prochaine étape : Versailles, Fontainebleau et Vaux-le-Vicomte.`;
}

const TAILLE = 150;

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
  icone: {
    width: TAILLE,
    height: TAILLE,
    borderRadius: 28,
    borderWidth: trait,
    borderColor: couleurs.encre,
    backgroundColor: couleurs.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: {
    fontFamily: polices.extraGras,
    fontSize: 26,
    color: couleurs.or,
    textAlign: 'center',
  },
  texte: {
    fontFamily: polices.moyen,
    fontSize: 17,
    lineHeight: 23,
    color: couleurs.fond,
    textAlign: 'center',
  },
  bouton: {
    alignSelf: 'stretch',
    marginTop: espace.s,
  },
});
