import type { SQLiteDatabase } from 'expo-sqlite';

import type { PointDate } from '@/db/points';
import { distanceTotale } from '@/profil/statistiques';
import { cleJour, jourDeCle } from '@/trajets/jours';

import { baseCompte } from './base';

// Rues parcourues, passages et purge des points bruts (T19).
// Les fonctions qui servent au recalage reçoivent la base en paramètre : un
// recalage commencé sur un compte ne doit jamais écrire dans celle d'un autre.

export type PointARecaler = PointDate & { id: number };
export type Passage = { segment_id: string; horodatage: number };

const JOURS_AVANT_PURGE = 7;

export function pointsARecaler(base: SQLiteDatabase, nombre: number): PointARecaler[] {
  return base.getAllSync<PointARecaler>(
    'SELECT id, latitude, longitude, horodatage FROM points WHERE recale = 0 ORDER BY horodatage LIMIT ?',
    [nombre],
  );
}

export function marquerRecale(base: SQLiteDatabase, id: number) {
  base.runSync('UPDATE points SET recale = 1 WHERE id = ?', [id]);
}

// Un passage validé sur un segment. Ignoré s'il est déjà connu (même segment, même heure).
export function enregistrerPassage(base: SQLiteDatabase, segmentId: string, horodatage: number) {
  const r = base.runSync(
    'INSERT OR IGNORE INTO passages (segment_id, jour, horodatage) VALUES (?, ?, ?)',
    [segmentId, cleJour(new Date(horodatage)), horodatage],
  );
  if (r.changes === 0) return;
  base.runSync(
    `INSERT INTO rues_parcourues (segment_id, premiere_fois, derniere_fois, nb_passages)
     VALUES (?, ?, ?, 1)
     ON CONFLICT (segment_id) DO UPDATE SET
       premiere_fois = min(premiere_fois, excluded.premiere_fois),
       derniere_fois = max(derniere_fois, excluded.derniere_fois),
       nb_passages = nb_passages + 1,
       envoyee = 0`,
    [segmentId, horodatage, horodatage],
  );
}

export function lireEtat(base: SQLiteDatabase, cle: string): string | null {
  return base.getFirstSync<{ valeur: string }>('SELECT valeur FROM etat WHERE cle = ?', [cle])?.valeur ?? null;
}

export function ecrireEtat(base: SQLiteDatabase, cle: string, valeur: string | null) {
  if (valeur === null) base.runSync('DELETE FROM etat WHERE cle = ?', [cle]);
  else base.runSync('INSERT OR REPLACE INTO etat (cle, valeur) VALUES (?, ?)', [cle, valeur]);
}

// Les passages d'une journée, dans l'ordre.
export function passagesDuJour(jour: Date = new Date()): Passage[] {
  return baseCompte().getAllSync<Passage>(
    'SELECT segment_id, horodatage FROM passages WHERE jour = ? ORDER BY horodatage',
    [cleJour(jour)],
  );
}

// Les jours qui ont au moins un passage, du plus ancien au plus récent.
export function joursAvecPassages(): Date[] {
  return baseCompte()
    .getAllSync<{ jour: string }>('SELECT DISTINCT jour FROM passages ORDER BY jour', [])
    .map(({ jour }) => jourDeCle(jour));
}

const JOUR_SQL = "date(horodatage / 1000, 'unixepoch', 'localtime')";

// Distance totale : les journées figées, plus celles dont on a encore les points.
export function distanceParcourue(): number {
  const base = baseCompte();
  const figee =
    base.getFirstSync<{ total: number | null }>('SELECT sum(metres) AS total FROM distances_jour', [])?.total ?? 0;
  const restants = base.getAllSync<PointDate>(
    `SELECT latitude, longitude, horodatage FROM points
     WHERE ${JOUR_SQL} NOT IN (SELECT jour FROM distances_jour)
     ORDER BY horodatage`,
    [],
  );
  return figee + distanceTotale(restants);
}

// Supprime les points bruts des journées de plus de 7 jours, seulement si tous
// leurs points sont recalés. Ils ne sont jamais envoyés au serveur (T22). La distance
// de la journée est figée juste avant. Renvoie le nombre de points supprimés.
export function purgerPointsBruts(base: SQLiteDatabase): number {
  const maintenant = new Date();
  const limite = cleJour(
    new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - JOURS_AVANT_PURGE),
  );
  const jours = base.getAllSync<{ jour: string }>(
    `SELECT ${JOUR_SQL} AS jour FROM points
     GROUP BY jour
     HAVING jour < ? AND min(recale) = 1`,
    [limite],
  );
  let supprimes = 0;
  for (const { jour } of jours) {
    base.withTransactionSync(() => {
      const points = base.getAllSync<PointDate>(
        `SELECT latitude, longitude, horodatage FROM points WHERE ${JOUR_SQL} = ? ORDER BY horodatage`,
        [jour],
      );
      base.runSync('INSERT OR IGNORE INTO distances_jour (jour, metres) VALUES (?, ?)', [
        jour,
        distanceTotale(points),
      ]);
      supprimes += base.runSync(`DELETE FROM points WHERE ${JOUR_SQL} = ?`, [jour]).changes;
    });
  }
  return supprimes;
}

// Mètres et pas de chaque journée, pour la sauvegarde sur le compte (T22).
// Mètres : la distance figée si la journée l'est, sinon celle de ses points.
export function statsParJour(base: SQLiteDatabase): Map<string, { metres: number; pas: number }> {
  const stats = new Map<string, { metres: number; pas: number }>();
  const ligne = (jour: string) => {
    let s = stats.get(jour);
    if (!s) stats.set(jour, (s = { metres: 0, pas: 0 }));
    return s;
  };
  for (const { jour, metres } of base.getAllSync<{ jour: string; metres: number }>(
    'SELECT jour, metres FROM distances_jour',
    [],
  )) {
    ligne(jour).metres = metres;
  }
  const points = base.getAllSync<PointDate & { jour: string }>(
    `SELECT latitude, longitude, horodatage, ${JOUR_SQL} AS jour FROM points
     WHERE ${JOUR_SQL} NOT IN (SELECT jour FROM distances_jour)
     ORDER BY horodatage`,
    [],
  );
  const parJour = new Map<string, PointDate[]>();
  for (const p of points) {
    const liste = parJour.get(p.jour) ?? [];
    liste.push(p);
    parJour.set(p.jour, liste);
  }
  for (const [jour, liste] of parJour) ligne(jour).metres = distanceTotale(liste);
  for (const { jour, pas } of base.getAllSync<{ jour: string; pas: number }>(
    'SELECT jour, pas FROM pas_jours',
    [],
  )) {
    ligne(jour).pas = pas;
  }
  return stats;
}
