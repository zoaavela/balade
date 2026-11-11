import { distanceEntre } from '@/balade/mesures';
import type { PointDate } from '@/db/points';
import { decouperEnTrajets } from '@/trajets/decouper';

// Distance parcourue, en mètres, additionnée trajet par trajet.
// Le saut entre la fin d'un trajet et le début du suivant ne compte pas :
// c'est un moment où l'app était fermée, pas une distance marchée.
export function distanceTotale(points: PointDate[]): number {
  let total = 0;
  for (const trajet of decouperEnTrajets(points)) {
    for (let i = 1; i < trajet.length; i++) {
      total += distanceEntre(trajet[i - 1], trajet[i]);
    }
  }
  return total;
}
