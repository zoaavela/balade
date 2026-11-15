// Ligne de test du réseau des rues, en bas du Profil, en développement seulement.
// À retirer au T20, quand la carte maison utilisera le réseau.

import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { couleurs, polices } from '@/theme';

import { chargerReseau, nomSegment, segmentsProches, typeSegment, zoneSegment } from './reseau';

export function TestReseau() {
  const [texte, setTexte] = useState('Réseau des rues : chargement…');

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        try {
          const r = await chargerReseau();
          const base = `Réseau chargé en ${r.chargeEn_ms} ms, ${r.nbSegments} segments.`;
          if (actif) setTexte(`${base} Recherche de la position…`);
          // Position fraîche et précise, pas la dernière connue qui peut dater.
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          const precision = position.coords.accuracy;
          const gps = `Précision GPS : ${precision === null ? 'inconnue' : `${Math.round(precision)} m`}.`;
          const debut = Date.now();
          const proches = segmentsProches(r, position.coords.latitude, position.coords.longitude, 25);
          const duree = Date.now() - debut;

          let suite: string;
          if (proches.length === 0) {
            suite = `Aucune rue à moins de 25 m (recherche en ${duree} ms).`;
          } else {
            const s = proches[0].segment;
            const zone = zoneSegment(r, s);
            suite =
              `${proches.length} segments à moins de 25 m (recherche en ${duree} ms). ` +
              `Rue la plus proche : ${nomSegment(r, s) ?? 'sans nom'} (${typeSegment(r, s)}), ` +
              `à ${Math.round(proches[0].distance_m)} m` +
              (zone ? `, ${zone.nom}.` : '.');
          }
          if (actif) setTexte(`${base} ${gps} ${suite}`);
        } catch (err) {
          if (actif) setTexte(`Réseau des rues : erreur, ${String(err)}`);
        }
      })();
      return () => {
        actif = false;
      };
    }, []),
  );

  return <Text style={styles.texte}>{texte}</Text>;
}

const styles = StyleSheet.create({
  texte: {
    fontFamily: polices.normal,
    fontSize: 13,
    lineHeight: 18,
    color: couleurs.encreDouce,
  },
});
