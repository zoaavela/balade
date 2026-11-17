import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Bouton } from '@/components/bouton';
import { premierePosition } from '@/suivi/premierePosition';
import { couleurs, espace, polices, trait } from '@/theme';

import { Feuille, Ligne, Section, stylesParametres as s } from './elements';
import {
  NOM_MAX, RAYONS, RAYON_DEFAUT, ZONES_MAX, ajouterZone, changerRayon, lireZones, supprimerZone,
  type ZonePrivee,
} from './zones';

// Zones privées : jusqu'à 3 cercles posés à sa position actuelle. Rien n'y est enregistré.
export function ZonesPrivees({ onRetour }: { onRetour: () => void }) {
  const [zones, setZones] = useState<ZonePrivee[]>(lireZones);
  const [nom, setNom] = useState('');
  const [rayon, setRayon] = useState(RAYON_DEFAUT);
  const [occupe, setOccupe] = useState(false);
  const relire = () => setZones(lireZones());

  async function ajouter() {
    setOccupe(true);
    const position = await premierePosition(15_000);
    setOccupe(false);
    if (!position) {
      Alert.alert('Position introuvable', 'Le GPS ne répond pas. Réessaie à découvert, près d’une fenêtre.');
      return;
    }
    try {
      ajouterZone(nom, position.coords, rayon);
      setNom('');
      relire();
    } catch (e) {
      Alert.alert('Zone non ajoutée', e instanceof Error ? e.message : 'Réessaie.');
    }
  }

  function modifier(z: ZonePrivee) {
    Alert.alert(z.nom, `Rayon actuel : ${z.rayon_m} m`, [
      ...RAYONS.map((r) => ({ text: `${r} m`, onPress: () => (changerRayon(z.id, r), relire()) })),
      { text: 'Supprimer la zone', style: 'destructive' as const, onPress: () => (supprimerZone(z.id), relire()) },
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <Feuille titre="Zones privées" onRetour={onRetour} libelleRetour="Paramètres">
      <Text style={s.texte}>
        Dans une zone privée, aucune position n'est enregistrée ni dessinée. Tu peux quand même y
        trouver un timbre. Les zones restent sur ce téléphone, elles ne sont jamais envoyées.
      </Text>

      {zones.length > 0 && (
        <Section titre={`Tes zones, ${zones.length} sur ${ZONES_MAX}`}>
          {zones.map((z) => (
            <Ligne key={z.id} titre={z.nom} valeur={`${z.rayon_m} m`} onPress={() => modifier(z)} />
          ))}
        </Section>
      )}

      {zones.length < ZONES_MAX && (
        <Section titre="Ajouter à ma position actuelle">
          <View style={styles.formulaire}>
            <TextInput
              style={s.champ}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom, par exemple Domicile"
              maxLength={NOM_MAX}
            />
            <View style={styles.rayons}>
              {RAYONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRayon(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: r === rayon }}
                  style={[styles.rayon, r === rayon && styles.rayonChoisi]}>
                  <Text style={[styles.rayonTexte, r === rayon && styles.rayonTexteChoisi]}>{r} m</Text>
                </Pressable>
              ))}
            </View>
            <Bouton titre={occupe ? 'Recherche de ta position…' : 'Ajouter la zone ici'} onPress={occupe ? () => {} : ajouter} />
          </View>
        </Section>
      )}
    </Feuille>
  );
}

const styles = StyleSheet.create({
  formulaire: {
    gap: espace.m,
    paddingTop: espace.m,
  },
  rayons: {
    flexDirection: 'row',
    gap: espace.s,
  },
  rayon: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: trait,
    borderColor: couleurs.encre,
    borderRadius: 999,
  },
  rayonChoisi: {
    backgroundColor: couleurs.encre,
  },
  rayonTexte: {
    fontFamily: polices.moyen,
    fontSize: 14,
    color: couleurs.encre,
  },
  rayonTexteChoisi: {
    color: couleurs.fond,
  },
});
