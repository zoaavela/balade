import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@/compte/supabase';
import { baseCompte } from '@/db/base';
import { ecrireEtat } from '@/db/rues';
import { cleJour } from '@/trajets/jours';

// Télécharger ses données et effacer son historique de déplacements (T32).

// Un fichier JSON avec tout ce qui concerne le compte : ce qui est sur le serveur
// (profil, confidentialité) et tout ce qui est sur le téléphone, positions comprises.
export async function exporterDonnees(email: string | undefined): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const base = baseCompte();
  const tout = (sql: string) => base.getAllSync<Record<string, unknown>>(sql, []);
  const [profil, confidentialite] = await Promise.all([
    supabase.from('profils').select('username, bio, cree_le, username_modifie_le').maybeSingle(),
    supabase.from('confidentialite').select('*').maybeSingle(),
  ]);
  if (profil.error) throw profil.error;
  if (confidentialite.error) throw confidentialite.error;

  const date = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString() : ms);
  const donnees = {
    exporte_le: new Date().toISOString(),
    compte: { email: email ?? null, profil: profil.data, photo: 'stockée à part, non incluse' },
    confidentialite: confidentialite.data,
    timbres: tout('SELECT lieu_id, debloquee_le FROM cartes_debloquees ORDER BY debloquee_le').map((l) => ({
      ...l,
      debloquee_le: date(l.debloquee_le),
    })),
    rues_parcourues: tout('SELECT segment_id, premiere_fois, derniere_fois, nb_passages FROM rues_parcourues').map(
      (l) => ({ ...l, premiere_fois: date(l.premiere_fois), derniere_fois: date(l.derniere_fois) }),
    ),
    passages: tout('SELECT segment_id, jour, horodatage FROM passages ORDER BY horodatage').map((l) => ({
      ...l,
      horodatage: date(l.horodatage),
    })),
    distances_par_jour: tout('SELECT jour, metres FROM distances_jour ORDER BY jour'),
    pas_par_jour: tout('SELECT jour, pas FROM pas_jours ORDER BY jour'),
    positions_brutes_7_jours: tout(
      'SELECT latitude, longitude, precision_m, horodatage FROM points ORDER BY horodatage',
    ).map((l) => ({ ...l, horodatage: date(l.horodatage) })),
    zones_privees: tout('SELECT nom, latitude, longitude, rayon_m FROM zones_privees'),
  };

  const fichier = new File(Paths.cache, `balade-donnees-${cleJour(new Date())}.json`);
  if (fichier.exists) fichier.delete();
  fichier.create();
  fichier.write(JSON.stringify(donnees, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Partage indisponible sur ce téléphone.');
  await Sharing.shareAsync(fichier.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

const CLES_RECALAGE = ['recalage_course', 'recalage_fenetre', 'recalage_attente'];

// Efface positions, rues parcourues, passages et kilomètres, sur le serveur puis sur le
// téléphone. Timbres, défis et pas sont gardés. Le serveur d'abord : s'il ne répond pas,
// rien n'est effacé, pour ne pas garder là-bas ce qui a disparu ici.
export async function effacerHistorique(): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const depuis = '1970-01-01';
  const rues = await supabase.from('rues_parcourues').delete().gte('premiere_fois', depuis);
  if (rues.error) throw rues.error;
  const passages = await supabase.from('passages_jours').delete().gte('jour', depuis);
  if (passages.error) throw passages.error;
  const stats = await supabase.from('stats_jours').update({ metres: 0 }).gte('jour', depuis);
  if (stats.error) throw stats.error;

  const base = baseCompte();
  base.withTransactionSync(() => {
    base.runSync('DELETE FROM points', []);
    base.runSync('DELETE FROM passages', []);
    base.runSync('DELETE FROM rues_parcourues', []);
    base.runSync('DELETE FROM distances_jour', []);
    for (const cle of CLES_RECALAGE) ecrireEtat(base, cle, null);
    // Les stats repartiront avec 0 mètre et les pas gardés.
    ecrireEtat(base, 'stats_envoyees', null);
  });
}
