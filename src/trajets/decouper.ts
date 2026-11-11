import type { PointDate } from '@/db/points';

export const PAUSE_MAX = 10 * 60 * 1000; // 10 minutes sans nouveau point : nouveau trajet

// Coupe une suite de points en trajets. L'app ne prend un point qu'après 15 m de
// déplacement : un long silence veut dire que tu t'es arrêté, ou que l'app était fermée.
export function decouperEnTrajets(points: PointDate[]): PointDate[][] {
  const trajets: PointDate[][] = [];
  let courant: PointDate[] = [];
  for (const point of points) {
    const precedent = courant[courant.length - 1];
    if (precedent && point.horodatage - precedent.horodatage > PAUSE_MAX) {
      trajets.push(courant);
      courant = [];
    }
    courant.push(point);
  }
  if (courant.length > 0) trajets.push(courant);
  return trajets;
}
