// Fonction Supabase supprimer-compte (T32), exécutée sur les serveurs de Supabase.
// Mise en place : docs/SUPABASE.md, étape 10.
//
// Supprime pour de vrai le compte qui appelle, et lui seul :
// 1. ses photos sur R2 (la photo du profil et les envois en attente) ;
// 2. le compte de connexion. Toutes les tables pointent vers lui avec « on delete cascade » :
//    profil, confidentialité, timbres, rues, passages et stats partent avec lui.
// La session est revérifiée ici. L'app doit envoyer { confirmation: "SUPPRIMER" }, pour
// qu'un appel par erreur ne puisse rien effacer.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const env = (nom: string) => {
  const v = Deno.env.get(nom);
  if (!v) throw new Error(`Secret manquant : ${nom}`);
  return v;
};

const r2 = new AwsClient({
  accessKeyId: env('R2_ACCESS_KEY_ID'),
  secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
  service: 's3',
  region: 'auto',
});
const racine = () => `${env('R2_ENDPOINT').replace(/\/$/, '')}/${env('R2_BUCKET')}`;

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const repondre = (statut: number, corps: Record<string, unknown>) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } });

async function supprimerFichier(cle: string) {
  const r = await r2.fetch(`${racine()}/${cle}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`R2 ${r.status}`);
}

// Les envois de photo pas encore validés de ce compte, rangés sous attente/<compte>/.
async function fichiersEnAttente(userId: string): Promise<string[]> {
  const url = new URL(racine());
  url.searchParams.set('list-type', '2');
  url.searchParams.set('prefix', `attente/${userId}/`);
  const r = await r2.fetch(url.toString());
  if (!r.ok) throw new Error(`R2 ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return repondre(405, { erreur: 'methode' });

  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data: auth } = await admin.auth.getUser(jeton);
  const user = auth?.user;
  if (!user) return repondre(401, { erreur: 'session' });

  let corps: { confirmation?: unknown };
  try {
    corps = await req.json();
  } catch {
    return repondre(400, { erreur: 'requete' });
  }
  if (corps.confirmation !== 'SUPPRIMER') return repondre(400, { erreur: 'confirmation' });

  try {
    // Les photos d'abord : une fois le compte supprimé, on ne saurait plus lesquelles sont à lui.
    const { data: profil } = await admin.from('profils').select('photo_cle').eq('user_id', user.id).maybeSingle();
    if (profil?.photo_cle) await supprimerFichier(profil.photo_cle);
    for (const cle of await fichiersEnAttente(user.id)) await supprimerFichier(cle);
  } catch (e) {
    console.error('Photos non supprimées', e);
    return repondre(502, { erreur: 'stockage' });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Compte non supprimé', error);
    return repondre(500, { erreur: 'compte' });
  }
  return repondre(200, { ok: true });
});
