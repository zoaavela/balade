import { distanceEntre, type Point } from '@/balade/mesures';
import { baseCompte } from '@/db/base';

// Zones privées (T32) : jusqu'à 3 cercles (domicile, travail...) où aucune position n'est
// enregistrée, donc jamais recalée ni dessinée. Elles restent sur le téléphone, jamais
// synchronisées. Le déblocage d'un lieu, lui, marche encore dedans : il ne garde que
// le lieu et la date, pas la position.

export type ZonePrivee = Point & { id: number; nom: string; rayon_m: number };

export const ZONES_MAX = 3;
export const RAYONS = [100, 150, 250, 400];
export const RAYON_DEFAUT = 150;
export const NOM_MAX = 30;

export function lireZones(): ZonePrivee[] {
  return baseCompte().getAllSync<ZonePrivee>(
    'SELECT id, nom, latitude, longitude, rayon_m FROM zones_privees ORDER BY id',
    [],
  );
}

export function dansUneZone(point: Point, zones: ZonePrivee[]): boolean {
  return zones.some((z) => distanceEntre(point, z) <= z.rayon_m);
}

// Ajoute une zone et efface les positions brutes déjà enregistrées dedans.
export function ajouterZone(nom: string, centre: Point, rayon: number) {
  const base = baseCompte();
  if (lireZones().length >= ZONES_MAX) throw new Error(`${ZONES_MAX} zones au plus.`);
  base.runSync('INSERT INTO zones_privees (nom, latitude, longitude, rayon_m) VALUES (?, ?, ?, ?)', [
    nom.trim().slice(0, NOM_MAX) || 'Zone privée',
    centre.latitude,
    centre.longitude,
    rayon,
  ]);
  effacerPointsDansLesZones();
}

export function changerRayon(id: number, rayon: number) {
  baseCompte().runSync('UPDATE zones_privees SET rayon_m = ? WHERE id = ?', [rayon, id]);
  effacerPointsDansLesZones();
}

export function supprimerZone(id: number) {
  baseCompte().runSync('DELETE FROM zones_privees WHERE id = ?', [id]);
}

function effacerPointsDansLesZones() {
  const base = baseCompte();
  const zones = lireZones();
  const points = base.getAllSync<Point & { id: number }>('SELECT id, latitude, longitude FROM points', []);
  base.withTransactionSync(() => {
    for (const p of points) {
      if (dansUneZone(p, zones)) base.runSync('DELETE FROM points WHERE id = ?', [p.id]);
    }
  });
}
