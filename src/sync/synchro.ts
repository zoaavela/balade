import { lieux } from '@/cartes/lieux';
import { supabase } from '@/compte/supabase';
import { baseCompte } from '@/db/base';
import { ecrireEtat, lireEtat, statsParJour } from '@/db/rues';
import { cleJour } from '@/trajets/jours';

import { changerStatut, lireStatut } from './statut';

// Synchronisation avec le compte Supabase. Le téléphone reste la source principale :
// on récupère d'abord ce qui manque ici (nouveau téléphone), puis on envoie ce qui n'est pas
// encore sauvegardé. Tout passe par la session de l'utilisateur : la sécurité par ligne du
// serveur refuse n'importe quelle ligne qui ne lui appartient pas.
//
// Depuis le T22, aucune position ne quitte le téléphone. Partent seulement : les timbres,
// les bouts de rue parcourus, les jours de passage sur chaque bout de rue (jamais l'heure),
// et les mètres et les pas de chaque journée.

const PAQUET_ENVOI = 500; // lignes envoyées par requête
const PAQUET_RECEPTION = 1000; // le serveur ne renvoie pas plus de 1000 lignes à la fois
const IDS_LIEUX = new Set(lieux.map((l) => l.id));
const SEGMENT_VALIDE = /^[0-9]{1,10}-[0-9]{1,5}$/;
const JOUR_VALIDE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAR_JOUR = 300000; // borne du serveur, en mètres comme en pas

const CLE_RUES_RECUES = 'rues_recues'; // rues et stats récupérées une fois sur ce téléphone
const CLE_STATS_ENVOYEES = 'stats_envoyees'; // dernières valeurs envoyées, par jour

let enCours = false;

// Renvoie true si des timbres ont été récupérés depuis le compte (l'album doit se rafraîchir).
export async function synchroniser(userId: string): Promise<boolean> {
  if (!supabase || enCours) return false;
  enCours = true;
  const precedent = lireStatut();
  changerStatut({ etat: 'en-cours' });
  try {
    const nouvellesCartes = await recevoirCartes();
    await recevoirRuesEtStats();
    await envoyerCartes(userId);
    await envoyerRues(userId);
    await envoyerPassagesJours(userId);
    await envoyerStats(userId);
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

// Une seule fois par téléphone : récupère les rues parcourues et les stats du compte,
// pour retrouver sa progression après une réinstallation ou un changement de téléphone.
// Les jours de passage restent sur le serveur : l'app n'en a pas besoin pour l'instant.
async function recevoirRuesEtStats() {
  const base = baseCompte();
  if (lireEtat(base, CLE_RUES_RECUES) === '1') return;

  for (let debut = 0; ; debut += PAQUET_RECEPTION) {
    const { data, error } = await supabase!
      .from('rues_parcourues')
      .select('segment_id, premiere_fois, derniere_fois, nb_passages')
      .order('segment_id')
      .range(debut, debut + PAQUET_RECEPTION - 1);
    if (error) throw error;
    base.withTransactionSync(() => {
      for (const r of data) {
        const premiere = Date.parse(r.premiere_fois);
        const derniere = Date.parse(r.derniere_fois);
        if (!SEGMENT_VALIDE.test(r.segment_id) || !Number.isFinite(premiere) || !Number.isFinite(derniere)) continue;
        // Déjà connue ici : on fusionne, sans toucher à ce qui reste à envoyer.
        base.runSync(
          `INSERT INTO rues_parcourues (segment_id, premiere_fois, derniere_fois, nb_passages, envoyee)
           VALUES (?, ?, ?, ?, 1)
           ON CONFLICT (segment_id) DO UPDATE SET
             premiere_fois = min(premiere_fois, excluded.premiere_fois),
             derniere_fois = max(derniere_fois, excluded.derniere_fois),
             nb_passages = max(nb_passages, excluded.nb_passages)`,
          [r.segment_id, premiere, derniere, Math.max(1, Math.round(r.nb_passages))],
        );
      }
    });
    if (data.length < PAQUET_RECEPTION) break;
  }

  const { data: stats, error } = await supabase!.from('stats_jours').select('jour, metres, pas');
  if (error) throw error;
  const aujourdhui = cleJour(new Date());
  const envoyees: Record<string, string> = {};
  base.withTransactionSync(() => {
    for (const s of stats) {
      if (!JOUR_VALIDE.test(s.jour)) continue;
      envoyees[s.jour] = valeurStats(s.metres, s.pas);
      // Aujourd'hui n'est pas figé : les points de la journée continuent de compter.
      if (s.jour < aujourdhui && s.metres > 0) {
        base.runSync('INSERT OR IGNORE INTO distances_jour (jour, metres) VALUES (?, ?)', [s.jour, s.metres]);
      }
      if (s.pas > 0) {
        base.runSync(
          `INSERT INTO pas_jours (jour, pas) VALUES (?, ?)
           ON CONFLICT (jour) DO UPDATE SET pas = max(pas, excluded.pas)`,
          [s.jour, Math.round(s.pas)],
        );
      }
    }
    ecrireEtat(base, CLE_STATS_ENVOYEES, JSON.stringify({ ...lireEnvoyees(), ...envoyees }));
    ecrireEtat(base, CLE_RUES_RECUES, '1');
  });
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

type RueLocale = { segment_id: string; premiere_fois: number; derniere_fois: number; nb_passages: number };

async function envoyerRues(userId: string) {
  const base = baseCompte();
  for (;;) {
    const rues = base.getAllSync<RueLocale>(
      `SELECT segment_id, premiere_fois, derniere_fois, nb_passages FROM rues_parcourues
       WHERE envoyee = 0 LIMIT ?`,
      [PAQUET_ENVOI],
    );
    if (rues.length === 0) return;

    const { error } = await supabase!.from('rues_parcourues').upsert(
      rues.map((r) => ({
        user_id: userId,
        segment_id: r.segment_id,
        premiere_fois: new Date(r.premiere_fois).toISOString(),
        derniere_fois: new Date(r.derniere_fois).toISOString(),
        nb_passages: r.nb_passages,
      })),
      { onConflict: 'user_id,segment_id' },
    );
    if (error) throw error;

    // Une rue repassée pendant l'envoi a changé : elle reste à envoyer.
    base.withTransactionSync(() => {
      for (const r of rues) {
        base.runSync(
          'UPDATE rues_parcourues SET envoyee = 1 WHERE segment_id = ? AND nb_passages = ? AND derniere_fois = ?',
          [r.segment_id, r.nb_passages, r.derniere_fois],
        );
      }
    });
    if (rues.length < PAQUET_ENVOI) return;
  }
}

// Les jours de passage, sans l'heure : un passage à 8 h 12 part comme « tel jour ».
async function envoyerPassagesJours(userId: string) {
  const base = baseCompte();
  for (;;) {
    const jours = base.getAllSync<{ segment_id: string; jour: string }>(
      'SELECT DISTINCT segment_id, jour FROM passages WHERE envoye = 0 LIMIT ?',
      [PAQUET_ENVOI],
    );
    if (jours.length === 0) return;

    const { error } = await supabase!.from('passages_jours').upsert(
      jours.map((j) => ({ user_id: userId, segment_id: j.segment_id, jour: j.jour })),
      { onConflict: 'user_id,segment_id,jour', ignoreDuplicates: true },
    );
    if (error) throw error;

    base.withTransactionSync(() => {
      for (const j of jours) {
        base.runSync('UPDATE passages SET envoye = 1 WHERE segment_id = ? AND jour = ?', [j.segment_id, j.jour]);
      }
    });
    if (jours.length < PAQUET_ENVOI) return;
  }
}

// Mètres et pas par jour : seuls les jours qui ont changé depuis le dernier envoi partent.
async function envoyerStats(userId: string) {
  const base = baseCompte();
  const envoyees = lireEnvoyees();
  const aEnvoyer: { user_id: string; jour: string; metres: number; pas: number }[] = [];
  for (const [jour, s] of statsParJour(base)) {
    const metres = Math.min(MAX_PAR_JOUR, Math.round(s.metres));
    const pas = Math.min(MAX_PAR_JOUR, Math.round(s.pas));
    if (envoyees[jour] === valeurStats(metres, pas)) continue;
    aEnvoyer.push({ user_id: userId, jour, metres, pas });
  }

  for (let i = 0; i < aEnvoyer.length; i += PAQUET_ENVOI) {
    const paquet = aEnvoyer.slice(i, i + PAQUET_ENVOI);
    const { error } = await supabase!.from('stats_jours').upsert(paquet, { onConflict: 'user_id,jour' });
    if (error) throw error;
    for (const s of paquet) envoyees[s.jour] = valeurStats(s.metres, s.pas);
    ecrireEtat(base, CLE_STATS_ENVOYEES, JSON.stringify(envoyees));
  }
}

function valeurStats(metres: number, pas: number): string {
  return `${Math.round(metres)}|${Math.round(pas)}`;
}

function lireEnvoyees(): Record<string, string> {
  try {
    return JSON.parse(lireEtat(baseCompte(), CLE_STATS_ENVOYEES) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
