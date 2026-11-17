import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { pointsDuJour, type PointDate } from '@/db/points';
import { useOptions } from '@/parametres/options';

import { traiterPositions } from './enregistrer';
import { dansExpoGo } from './environnement';
import { surNouveauxPoints } from './evenements';
import { demanderNotifications } from './notifications';
import { arreterSuiviFond, demarrerSuiviFond, relancerSuiviFond } from './tacheFond';

// Lance le suivi tant que la localisation est autorisée et renvoie les points du jour.
// - Build avec autorisation « Toujours » : suivi en arrière-plan (tacheFond.ts), app fermée comprise.
// - Sinon (Expo Go, ou seulement « Pendant l'utilisation ») : suivi tant que l'app est ouverte.
// Dans les deux cas, les positions passent par traiterPositions, qui enregistre et débloque.
export function useSuiviPosition(autorise: boolean): PointDate[] {
  const [points, setPoints] = useState<PointDate[]>([]);
  // Réglages du T32 : suivi en arrière-plan coupé, et mode économie.
  const { suivi_fond, economie } = useOptions();

  // Relit le tracé du jour au démarrage et à chaque retour dans l'app : des points ont pu
  // arriver en arrière-plan, et minuit a pu passer.
  useEffect(() => {
    setPoints(pointsDuJour());
    const abonnement = AppState.addEventListener('change', (statut) => {
      if (statut === 'active') setPoints(pointsDuJour());
    });
    const desabonner = surNouveauxPoints((nouveaux) => setPoints((p) => [...p, ...nouveaux]));
    return () => {
      abonnement.remove();
      desabonner();
    };
  }, []);

  useEffect(() => {
    if (!autorise) return;
    let suivi: Location.LocationSubscription | null = null;
    let arrete = false;

    (async () => {
      if (!dansExpoGo) {
        if (suivi_fond && (await demarrerSuiviFond())) {
          await relancerSuiviFond(); // reprend le mode économie s'il vient de changer
          demanderNotifications();
          return;
        }
        if (!suivi_fond) await arreterSuiviFond(); // suivi seulement app ouverte
      }
      if (arrete) return;
      const abonnement = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High, // moins précis, les points seraient jetés (30 m)
          timeInterval: economie ? 20000 : 10000, // Android uniquement, iOS se règle sur la distance
          distanceInterval: economie ? 30 : 15,
        },
        (position) => traiterPositions([position]),
      );
      if (arrete) abonnement.remove();
      else suivi = abonnement;
    })().catch(() => {
      // Autorisation retirée entre-temps : l'écran Carte affichera le message adapté.
    });

    return () => {
      arrete = true;
      suivi?.remove();
    };
  }, [autorise, suivi_fond, economie]);

  return points;
}
