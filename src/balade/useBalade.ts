import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { distanceEntre, type Point } from './mesures';

const PRECISION_MAX = 30; // mètres : au-delà, le point est jeté pour éviter les zigzags

export type Statut = 'repos' | 'en-cours' | 'terminee';

// Toute la logique d'une balade : suivi GPS, tracé, distance, durée.
// L'écran Carte ne fait qu'afficher ce que ce hook lui donne.
export function useBalade() {
  const [statut, setStatut] = useState<Statut>('repos');
  const [points, setPoints] = useState<Point[]>([]);
  const [distance, setDistance] = useState(0);
  const [debut, setDebut] = useState(0);
  const [fin, setFin] = useState(0);
  const [maintenant, setMaintenant] = useState(0);
  const suivi = useRef<Location.LocationSubscription | null>(null);
  const dernier = useRef<Point | null>(null);
  const actif = useRef(false);

  // Fait avancer le chronomètre chaque seconde pendant la balade.
  useEffect(() => {
    if (statut !== 'en-cours') return;
    const minuteur = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuteur);
  }, [statut]);

  // Coupe le GPS si l'écran disparaît en pleine balade.
  useEffect(() => () => suivi.current?.remove(), []);

  async function demarrer() {
    const t = Date.now();
    setPoints([]);
    setDistance(0);
    setDebut(t);
    setMaintenant(t);
    dernier.current = null;
    setStatut('en-cours');

    actif.current = true;
    const abonnement = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000, // Android uniquement, iOS se règle sur la distance
        distanceInterval: 10,
      },
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy == null || accuracy > PRECISION_MAX) return;
        const point = { latitude, longitude };
        if (dernier.current) {
          const pas = distanceEntre(dernier.current, point);
          setDistance((d) => d + pas);
        }
        dernier.current = point;
        setPoints((p) => [...p, point]);
      },
    );
    // Si « Terminer » a été touché pendant le démarrage du GPS, on coupe tout de suite.
    if (actif.current) suivi.current = abonnement;
    else abonnement.remove();
  }

  function terminer() {
    actif.current = false;
    suivi.current?.remove();
    suivi.current = null;
    setFin(Date.now());
    setStatut('terminee');
  }

  function fermerResume() {
    setPoints([]);
    setDistance(0);
    setStatut('repos');
  }

  const duree = statut === 'terminee' ? fin - debut : statut === 'en-cours' ? maintenant - debut : 0;

  return { statut, points, distance, duree, demarrer, terminer, fermerResume };
}
