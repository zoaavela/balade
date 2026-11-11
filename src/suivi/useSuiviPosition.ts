import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { Point } from '@/balade/mesures';
import { ajouterPoint, pointsDuJour } from '@/db/points';

const PRECISION_MAX = 30; // mètres : au-delà, le point est jeté pour éviter les zigzags

// Suit la position tant que l'app est ouverte et que la localisation est autorisée.
// Chaque point valable est écrit dans la base puis passé à onPoint. Renvoie le tracé du jour.
export function useSuiviPosition(autorise: boolean, onPoint: (point: Point) => void): Point[] {
  const [points, setPoints] = useState<Point[]>([]);

  // Relit le tracé du jour au démarrage et à chaque retour dans l'app (utile après minuit).
  useEffect(() => {
    setPoints(pointsDuJour());
    const abonnement = AppState.addEventListener('change', (statut) => {
      if (statut === 'active') setPoints(pointsDuJour());
    });
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!autorise) return;
    let suivi: Location.LocationSubscription | null = null;
    let arrete = false;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Android uniquement, iOS se règle sur la distance
        distanceInterval: 15,
      },
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy == null || accuracy > PRECISION_MAX) return;
        ajouterPoint({ latitude, longitude, precision_m: accuracy, horodatage: position.timestamp });
        setPoints((p) => [...p, { latitude, longitude }]);
        onPoint({ latitude, longitude });
      },
    )
      .then((abonnement) => {
        if (arrete) abonnement.remove();
        else suivi = abonnement;
      })
      .catch(() => {
        // Autorisation retirée entre-temps : l'écran Carte affichera le message adapté.
      });

    return () => {
      arrete = true;
      suivi?.remove();
    };
  }, [autorise, onPoint]);

  return points;
}
