import type { Point } from '@/balade/mesures';
import { debutDuJour, jourSuivant } from '@/trajets/jours';

import { baseCompte } from './base';

export type PointDate = Point & { horodatage: number }; // millisecondes depuis 1970

export type PointEnregistre = PointDate & { precision_m: number };

export function ajouterPoint(p: PointEnregistre) {
  baseCompte().runSync(
    'INSERT OR IGNORE INTO points (latitude, longitude, precision_m, horodatage) VALUES (?, ?, ?, ?)',
    [p.latitude, p.longitude, p.precision_m, Math.round(p.horodatage)],
  );
}

// Tous les points d'une journée (aujourd'hui par défaut), dans l'ordre où ils ont été pris.
export function pointsDuJour(jour: Date = new Date()): PointDate[] {
  const debut = debutDuJour(jour);
  return baseCompte().getAllSync<PointDate>(
    'SELECT latitude, longitude, horodatage FROM points WHERE horodatage >= ? AND horodatage < ? ORDER BY horodatage',
    [debut.getTime(), jourSuivant(debut).getTime()],
  );
}

// Tous les points jamais enregistrés, dans l'ordre.
export function tousLesPoints(): PointDate[] {
  return baseCompte().getAllSync<PointDate>(
    'SELECT latitude, longitude, horodatage FROM points ORDER BY horodatage',
    [],
  );
}

// Les jours qui ont au moins un point, du plus ancien au plus récent (à minuit, heure locale).
export function joursAvecPoints(): Date[] {
  const lignes = baseCompte().getAllSync<{ jour: string }>(
    "SELECT DISTINCT date(horodatage / 1000, 'unixepoch', 'localtime') AS jour FROM points ORDER BY jour",
    [],
  );
  return lignes.map(({ jour }) => {
    const [a, m, j] = jour.split('-').map(Number);
    return new Date(a, m - 1, j);
  });
}
