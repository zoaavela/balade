import { lieux } from '@/cartes/lieux';
import { supabase } from '@/compte/supabase';
import { baseCompte } from '@/db/base';

import { changerStatut, lireStatut } from './statut';

// Synchronisation avec le compte Supabase. Le téléphone reste la source principale :
// on récupère d'abord ce qui manque ici (nouveau téléphone), puis on envoie ce qui n'est pas
// encore sauvegardé. Tout passe par la session de l'utilisateur : la sécurité par ligne du
// serveur refuse n'importe quelle ligne qui ne lui appartient pas.

const PAQUET_ENVOI = 500; // points envoyés par requête
const PAQUET_RECEPTION = 1000; // le serveur ne renvoie pas plus de 1000 lignes à la fois
const IDS_LIEUX = new Set(lieux.map((l) => l.id));

let enCours = false;

// Renvoie true si des cartes ont été récupérées depuis le compte (l'album doit se rafraîchir).
export async function synchroniser(userId: string): Promise<boolean> {
  if (!supabase || enCours) return false;
  enCours = true;
  const precedent = lireStatut();
  changerStatut({ etat: 'en-cours' });
  try {
    const nouvellesCartes = await recevoirCartes();
    await recevoirPoints();
    await envoyerCartes(userId);
    await envoyerPoints(userId);
    changerStatut({ etat: 'ok', le: new Date() });
    return nouvellesCartes;
  } catch {
    // Pas de réseau ou serveur indisponible : on réessaiera plus tard, rien n'est perdu.
    const dernierOk =
      precedent.etat === 'ok'
        ? precedent.le
        : precedent.etat === 'hors-ligne'
          ? precedent.dernierOk
          : undefined;
    changerStatut({ etat: 'hors-ligne', dernierOk });
    return false;
  } finally {
    enCours = false;
  }
}

// Nombre de points pas encore sauvegardés sur le compte.
export function pointsEnAttente(): number {
  const ligne = baseCompte().getFirstSync<{ n: number }>(
    'SELECT count(*) AS n FROM points WHERE envoye = 0',
    [],
  );
  return ligne?.n ?? 0;
}

async function recevoirCartes(): Promise<boolean> {
  const { data, error } = await supabase!
    .from('cartes_debloquees')
    .select('lieu_id, debloquee_le');
  if (error) throw error;

  const base = baseCompte();
  let nouvelles = false;
  base.withTransactionSync(() => {
    for (const carte of data) {
      if (!IDS_LIEUX.has(carte.lieu_id)) continue; // lieu inconnu de cette version de l'app
      const quand = Date.parse(carte.debloquee_le);
      if (!Number.isFinite(quand)) continue;
      // Si la carte existe déjà ici, on garde la date la plus ancienne.
      const r = base.runSync(
        `INSERT INTO cartes_debloquees (lieu_id, debloquee_le, envoyee) VALUES (?, ?, 1)
         ON CONFLICT (lieu_id) DO UPDATE SET debloquee_le = excluded.debloquee_le
         WHERE excluded.debloquee_le < cartes_debloquees.debloquee_le`,
        [carte.lieu_id, quand],
      );
      if (r.changes > 0) nouvelles = true;
    }
  });
  return nouvelles;
}

async function recevoirPoints() {
  const base = baseCompte();
  let curseur =
    base.getFirstSync<{ valeur: string }>("SELECT valeur FROM etat WHERE cle = 'points_recus_jusqua'", [])
      ?.valeur ?? '1970-01-01T00:00:00Z';

  // Page après page, du plus ancien au plus récent.
  for (;;) {
    const { data, error } = await supabase!
      .from('points')
      .select('latitude, longitude, precision_m, horodatage')
      .gt('horodatage', curseur)
      .order('horodatage', { ascending: true })
      .limit(PAQUET_RECEPTION);
    if (error) throw error;
    if (data.length === 0) break;

    base.withTransactionSync(() => {
      for (const p of data) {
        const quand = Date.parse(p.horodatage);
        if (!Number.isFinite(quand)) continue;
        base.runSync(
          'INSERT OR IGNORE INTO points (latitude, longitude, precision_m, horodatage, envoye) VALUES (?, ?, ?, ?, 1)',
          [p.latitude, p.longitude, p.precision_m, quand],
        );
      }
      curseur = data[data.length - 1].horodatage;
      base.runSync("INSERT OR REPLACE INTO etat (cle, valeur) VALUES ('points_recus_jusqua', ?)", [
        curseur,
      ]);
    });
    if (data.length < PAQUET_RECEPTION) break;
  }
}

async function envoyerCartes(userId: string) {
  const base = baseCompte();
  const cartes = base.getAllSync<{ lieu_id: string; debloquee_le: number }>(
    'SELECT lieu_id, debloquee_le FROM cartes_debloquees WHERE envoyee = 0',
    [],
  );
  if (cartes.length === 0) return;

  const { error } = await supabase!.from('cartes_debloquees').upsert(
    cartes.map((c) => ({
      user_id: userId,
      lieu_id: c.lieu_id,
      debloquee_le: new Date(c.debloquee_le).toISOString(),
    })),
    { onConflict: 'user_id,lieu_id', ignoreDuplicates: true },
  );
  if (error) throw error;

  base.withTransactionSync(() => {
    for (const c of cartes) {
      base.runSync('UPDATE cartes_debloquees SET envoyee = 1 WHERE lieu_id = ?', [c.lieu_id]);
    }
  });
}

async function envoyerPoints(userId: string) {
  const base = baseCompte();
  for (;;) {
    const points = base.getAllSync<{
      id: number;
      latitude: number;
      longitude: number;
      precision_m: number;
      horodatage: number;
    }>(
      'SELECT id, latitude, longitude, precision_m, horodatage FROM points WHERE envoye = 0 ORDER BY horodatage LIMIT ?',
      [PAQUET_ENVOI],
    );
    if (points.length === 0) return;

    const { error } = await supabase!.from('points').upsert(
      points.map((p) => ({
        user_id: userId,
        latitude: p.latitude,
        longitude: p.longitude,
        precision_m: p.precision_m,
        horodatage: new Date(p.horodatage).toISOString(),
      })),
      { onConflict: 'user_id,horodatage', ignoreDuplicates: true },
    );
    if (error) throw error;

    base.withTransactionSync(() => {
      for (const p of points) base.runSync('UPDATE points SET envoye = 1 WHERE id = ?', [p.id]);
    });
    if (points.length < PAQUET_ENVOI) return;
  }
}
