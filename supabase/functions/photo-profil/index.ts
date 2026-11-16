// Fonction Supabase photo-profil (T29), exécutée sur les serveurs de Supabase.
// Les clés R2 sont dans ses secrets, jamais dans l'app. Mise en place : docs/SUPABASE.md.
//
// Toutes les actions exigent une session valide (vérifiée ici, en plus de Supabase).
// - lien_envoi : renvoie un lien d'envoi signé, valable 5 minutes, vers attente/<compte>/<aléatoire>.jpg
// - valider    : relit le fichier envoyé, vérifie JPEG, taille, dimensions et absence de
//                métadonnées. S'il est bon, il devient la photo du profil sous un nom aléatoire.
//                Sinon il est supprimé. L'ancienne photo est supprimée.
// - lien_lecture : renvoie un lien de lecture signé, valable une heure, de sa propre photo.
// - supprimer  : supprime sa photo.
// Le bucket R2 est privé : personne ne lit une photo sans lien signé.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

const TAILLE_MAX = 2 * 1024 * 1024;
const COTE_MAX = 512;
const DUREE_ENVOI_S = 300;
const DUREE_LECTURE_S = 3600;

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
// Exemple : https://<identifiant du compte>.eu.r2.cloudflarestorage.com
const adresse = (cle: string) => `${env('R2_ENDPOINT').replace(/\/$/, '')}/${env('R2_BUCKET')}/${cle}`;

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const repondre = (statut: number, corps: Record<string, unknown>) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } });

async function lienSigne(cle: string, methode: 'PUT' | 'GET', duree: number, entetes: Record<string, string> = {}) {
  const url = new URL(adresse(cle));
  url.searchParams.set('X-Amz-Expires', String(duree));
  const signe = await r2.sign(new Request(url, { method: methode, headers: entetes }), {
    aws: { signQuery: true, allHeaders: true },
  });
  return signe.url;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return repondre(405, { erreur: 'methode' });

  // Qui appelle ? Le jeton de session est revérifié auprès de Supabase.
  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data: auth } = await admin.auth.getUser(jeton);
  const user = auth?.user;
  if (!user) return repondre(401, { erreur: 'session' });

  let corps: { action?: unknown; cle?: unknown };
  try {
    corps = await req.json();
  } catch {
    return repondre(400, { erreur: 'requete' });
  }

  const { data: profil } = await admin.from('profils').select('photo_cle').eq('user_id', user.id).maybeSingle();
  if (!profil) return repondre(409, { erreur: 'profil' }); // username d'abord

  switch (corps.action) {
    case 'lien_envoi': {
      const cle = `attente/${user.id}/${crypto.randomUUID()}.jpg`;
      const url = await lienSigne(cle, 'PUT', DUREE_ENVOI_S, { 'content-type': 'image/jpeg' });
      return repondre(200, { cle, url });
    }

    case 'valider': {
      // Seulement un fichier envoyé par ce compte, à l'endroit prévu.
      const attendu = new RegExp(`^attente/${user.id}/[0-9a-f-]{36}\\.jpg$`);
      if (typeof corps.cle !== 'string' || !attendu.test(corps.cle)) return repondre(400, { erreur: 'cle' });
      const recu = await r2.fetch(adresse(corps.cle));
      if (!recu.ok) return repondre(404, { erreur: 'fichier' });
      const octets = new Uint8Array(await recu.arrayBuffer());
      await r2.fetch(adresse(corps.cle), { method: 'DELETE' });

      const probleme = octets.length > TAILLE_MAX ? 'taille' : verifierJpeg(octets);
      if (probleme) return repondre(422, { erreur: probleme });

      const finale = `avatars/${crypto.randomUUID()}.jpg`;
      const envoi = await r2.fetch(adresse(finale), {
        method: 'PUT',
        body: octets,
        headers: { 'content-type': 'image/jpeg' },
      });
      if (!envoi.ok) return repondre(502, { erreur: 'stockage' });
      const maj = await admin.from('profils').update({ photo_cle: finale }).eq('user_id', user.id);
      if (maj.error) {
        await r2.fetch(adresse(finale), { method: 'DELETE' });
        return repondre(500, { erreur: 'profil' });
      }
      if (profil.photo_cle) await r2.fetch(adresse(profil.photo_cle), { method: 'DELETE' });
      return repondre(200, { ok: true });
    }

    case 'lien_lecture': {
      if (!profil.photo_cle) return repondre(200, { url: null });
      return repondre(200, { url: await lienSigne(profil.photo_cle, 'GET', DUREE_LECTURE_S) });
    }

    case 'supprimer': {
      if (profil.photo_cle) {
        await admin.from('profils').update({ photo_cle: null }).eq('user_id', user.id);
        await r2.fetch(adresse(profil.photo_cle), { method: 'DELETE' });
      }
      return repondre(200, { ok: true });
    }

    default:
      return repondre(400, { erreur: 'action' });
  }
});

// Parcourt toute la structure du JPEG. Refuse tout bloc de métadonnées (Exif et sa
// position GPS, XMP, IPTC, commentaires) et une image de plus de 512 px.
// Gardés : JFIF (APP0), profil de couleurs (APP2), Adobe (APP14), et l'image elle-même.
// Renvoie null si tout va bien, sinon la raison.
function verifierJpeg(b: Uint8Array): string | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return 'format';
  let i = 2;
  let largeur = 0;
  let hauteur = 0;
  while (i < b.length) {
    if (b[i] !== 0xff) return 'format';
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; } // octet de remplissage
    if (m === 0xd9) break; // fin de l'image
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
    if (i + 4 > b.length) return 'format';
    const longueur = (b[i + 2] << 8) | b[i + 3];
    if (longueur < 2 || i + 2 + longueur > b.length) return 'format';
    const appInterdit = m >= 0xe1 && m <= 0xef && m !== 0xe2 && m !== 0xee;
    if (appInterdit || m === 0xfe) return 'metadonnees';
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      hauteur = (b[i + 5] << 8) | b[i + 6];
      largeur = (b[i + 7] << 8) | b[i + 8];
    }
    i += 2 + longueur;
    if (m === 0xda) {
      // Données de l'image : on avance jusqu'au prochain vrai marqueur.
      while (i + 1 < b.length && !(b[i] === 0xff && b[i + 1] !== 0x00 && (b[i + 1] < 0xd0 || b[i + 1] > 0xd7))) i++;
    }
  }
  if (!largeur || !hauteur) return 'format';
  if (largeur > COTE_MAX || hauteur > COTE_MAX) return 'dimensions';
  return null;
}
