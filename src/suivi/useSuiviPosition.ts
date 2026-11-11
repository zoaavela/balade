import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { pointsDuJour, type PointDate } from '@/db/points';

import { traiterPositions } from './enregistrer';
import { dansExpoGo } from './environnement';
import { surNouveauxPoints } from './evenements';
import { demanderNotifications } from './notifications';
import { demarrerSuiviFond } from './tacheFond';

// Lance le suivi tant que la localisation est autorisée et renvoie les points du jour.
// - Build avec autorisation « Toujours » : suivi en arrière-plan (tacheFond.ts), app fermée comprise.
// - Sinon (Expo Go, ou seulement « Pendant l'utilisation ») : suivi tant que l'app est ouverte.
// Dans les deux cas, les positions passent par traiterPositions, qui enregistre et débloque.
export function useSuiviPosition(autorise: boolean): PointDate[] {
  const [points, setPoints] = useState<PointDate[]>([]);

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
      if (!dansExpoGo && (await demarrerSuiviFond())) {
        demanderNotifications();
        return;
      }
      if (arrete) return;
      const abonnement = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Android uniquement, iOS se règle sur la distance
          distanceInterval: 15,
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
  }, [autorise]);

  return points;
}
