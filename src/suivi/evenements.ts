import type { Lieu } from '@/cartes/lieux';
import type { PointDate } from '@/db/points';

// Petits messages entre le suivi (qui peut tourner en arrière-plan, sans écran)
// et les écrans quand l'app est ouverte : nouveaux points, nouvelles cartes.

type Ecouteurs<T> = Set<(valeur: T) => void>;

const ecouteursPoints: Ecouteurs<PointDate[]> = new Set();
const ecouteursCartes: Ecouteurs<{ lieux: Lieu[]; date: Date }> = new Set();

export function surNouveauxPoints(f: (points: PointDate[]) => void) {
  ecouteursPoints.add(f);
  return () => {
    ecouteursPoints.delete(f);
  };
}

export function surNouvellesCartes(f: (cartes: { lieux: Lieu[]; date: Date }) => void) {
  ecouteursCartes.add(f);
  return () => {
    ecouteursCartes.delete(f);
  };
}

export function annoncerPoints(points: PointDate[]) {
  ecouteursPoints.forEach((f) => f(points));
}

// Renvoie false si aucun écran n'écoute (app en arrière-plan ou réveillée sans écran).
export function annoncerCartes(lieux: Lieu[], date: Date): boolean {
  ecouteursCartes.forEach((f) => f({ lieux, date }));
  return ecouteursCartes.size > 0;
}
