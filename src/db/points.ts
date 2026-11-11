import type { Point } from '@/balade/mesures';
import { debutDuJour, jourSuivant } from '@/trajets/jours';

import { ouvrirBase } from './base';

export type PointDate = Point & { horodatage: number }; // millisecondes depuis 1970

export type PointEnregistre = PointDate & { precision_m: number };

export function ajouterPoint(p: PointEnregistre) {
  ouvrirBase().runSync(
    'INSERT INTO points (latitude, longitude, precision_m, horodatage) VALUES (?, ?, ?, ?)',
    [p.latitude, p.longitude, p.precision_m, p.horodatage],
  );
}

// Tous les points d'une journée (aujourd'hui par défaut), dans l'ordre où ils ont été pris.
export function pointsDuJour(jour: Date = new Date()): PointDate[] {
  const debut = debutDuJour(jour);
  return ouvrirBase().getAllSync<PointDate>(
    'SELECT latitude, longitude, horodatage FROM points WHERE horodatage >= ? AND horodatage < ? ORDER BY horodatage',
    [debut.getTime(), jourSuivant(debut).getTime()],
  );
}

// Les jours qui ont au moins un point, du plus ancien au plus récent (à minuit, heure locale).
export function joursAvecPoints(): Date[] {
  const lignes = ouvrirBase().getAllSync<{ jour: string }>(
    "SELECT DISTINCT date(horodatage / 1000, 'unixepoch', 'localtime') AS jour FROM points ORDER BY jour",
    [],
  );
  return lignes.map(({ jour }) => {
    const [a, m, j] = jour.split('-').map(Number);
    return new Date(a, m - 1, j);
  });
}
