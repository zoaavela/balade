import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { Point } from '@/balade/mesures';
import type { Passage } from '@/db/rues';
import { chargerReseau, coordonneesSegment, reseauSiCharge, segmentDepuisId, type Reseau } from '@/rues/reseau';
import { surNouveauxPassages } from '@/suivi/evenements';

import { PAUSE_MAX } from './decouper';

// Un trajet dessiné : uniquement des morceaux de rue, jamais de positions brutes.
// Les segments qui se suivent sont mis bout à bout en une seule ligne.
export type TrajetTrace = { debut: number; lignes: Point[][] };

const memePoint = (a: Point, b: Point) => a.latitude === b.latitude && a.longitude === b.longitude;

export function tracerTrajets(r: Reseau, passages: Passage[]): TrajetTrace[] {
  const trajets: TrajetTrace[] = [];
  let courant: TrajetTrace | null = null;
  let ligne: Point[] | null = null;
  let precedent = -1;
  let dernierPassage = -Infinity;

  for (const p of passages) {
    const s = segmentDepuisId(r, p.segment_id);
    if (s === null) continue; // segment disparu après une mise à jour des rues
    if (!courant || p.horodatage - dernierPassage > PAUSE_MAX) {
      courant = { debut: p.horodatage, lignes: [] };
      trajets.push(courant);
      ligne = null;
      precedent = -1;
    }
    dernierPassage = p.horodatage;
    if (s === precedent) continue;
    precedent = s;

    const coords = coordonneesSegment(r, s);
    if (ligne) {
      // Une ligne d'un seul segment peut être prise à l'envers : on la retourne si besoin.
      const fin = ligne[ligne.length - 1];
      const debut = ligne[0];
      const touche = (q: Point) => memePoint(q, coords[0]) || memePoint(q, coords[coords.length - 1]);
      if (!touche(fin) && touche(debut)) ligne.reverse();
      const bout = ligne[ligne.length - 1];
      if (memePoint(bout, coords[0])) {
        ligne.push(...coords.slice(1));
        continue;
      }
      if (memePoint(bout, coords[coords.length - 1])) {
        ligne.push(...coords.slice(0, -1).reverse());
        continue;
      }
    }
    ligne = coords;
    courant.lignes.push(ligne);
  }
  return trajets;
}

// Le réseau des rues, une fois chargé.
export function useReseau(): Reseau | null {
  const [reseau, setReseau] = useState<Reseau | null>(reseauSiCharge());
  useEffect(() => {
    if (reseau) return;
    let actif = true;
    chargerReseau()
      .then((r) => actif && setReseau(r))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [reseau]);
  return reseau;
}

// Un numéro qui change à chaque nouveau passage enregistré ou retour dans l'app :
// les écrans s'en servent pour relire les passages.
export function useVersionPassages(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const plus = () => setVersion((v) => v + 1);
    const desabonner = surNouveauxPassages(plus);
    const abonnement = AppState.addEventListener('change', (statut) => {
      if (statut === 'active') plus();
    });
    return () => {
      desabonner();
      abonnement.remove();
    };
  }, []);
  return version;
}
