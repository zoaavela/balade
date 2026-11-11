import type { Point } from '@/balade/mesures';

import { ouvrirBase } from './base';

export type PointEnregistre = Point & {
  precision_m: number;
  horodatage: number;
};

export function ajouterPoint(p: PointEnregistre) {
  ouvrirBase().runSync(
    'INSERT INTO points (latitude, longitude, precision_m, horodatage) VALUES (?, ?, ?, ?)',
    [p.latitude, p.longitude, p.precision_m, p.horodatage],
  );
}

// Tous les points depuis minuit, dans l'ordre où ils ont été pris.
export function pointsDuJour(): Point[] {
  const minuit = new Date();
  minuit.setHours(0, 0, 0, 0);
  return ouvrirBase().getAllSync<Point>(
    'SELECT latitude, longitude FROM points WHERE horodatage >= ? ORDER BY horodatage',
    [minuit.getTime()],
  );
}
