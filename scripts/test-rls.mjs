// Vérifie la sécurité par ligne de Supabase avec deux comptes de test.
// Lancement : npm run test:rls (lit .env.local, voir .env.example).
// Le compte A écrit des données, puis on vérifie que B et un visiteur sans compte
// ne peuvent ni les lire, ni les modifier, ni les supprimer, ni écrire au nom de A.

import { createClient } from '@supabase/supabase-js';

const {
  EXPO_PUBLIC_SUPABASE_URL: url,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: cle,
  TEST_A_EMAIL,
  TEST_A_PASSWORD,
  TEST_B_EMAIL,
  TEST_B_PASSWORD,
} = process.env;

if (!url || !cle || !TEST_A_EMAIL || !TEST_A_PASSWORD || !TEST_B_EMAIL || !TEST_B_PASSWORD) {
  console.error('Il manque des variables dans .env.local (voir .env.example).');
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
let echecs = 0;

function verifier(condition, description) {
  console.log(`${condition ? 'OK    ' : 'ÉCHEC '} ${description}`);
  if (!condition) echecs++;
}

async function connecter(email, motDePasse) {
  const client = createClient(url, cle, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password: motDePasse });
  if (error) throw new Error(`Connexion impossible pour ${email} : ${error.message}`);
  return { client, id: data.user.id };
}

const A = await connecter(TEST_A_EMAIL, TEST_A_PASSWORD);
const B = await connecter(TEST_B_EMAIL, TEST_B_PASSWORD);
const visiteur = createClient(url, cle, options);
const LIEU = 'test-rls';
const quand = new Date().toISOString();

// Nettoyage d'un essai précédent, puis données de A.
await A.client.from('cartes_debloquees').delete().eq('lieu_id', LIEU);
const SEGMENT = '4294967295-1'; // un bout de rue qui n'existe pas dans le réseau
const JOUR = '2024-01-02';
await A.client.from('rues_parcourues').delete().eq('segment_id', SEGMENT);
await A.client.from('passages_jours').delete().eq('segment_id', SEGMENT);
await A.client.from('stats_jours').delete().eq('jour', JOUR);

const carteA = await A.client
  .from('cartes_debloquees')
  .insert({ lieu_id: LIEU, debloquee_le: quand })
  .select();
verifier(!carteA.error && carteA.data.length === 1, 'A ajoute sa carte');

const rueA = await A.client
  .from('rues_parcourues')
  .insert({ segment_id: SEGMENT, premiere_fois: quand, derniere_fois: quand, nb_passages: 1 })
  .select();
verifier(!rueA.error && rueA.data.length === 1, 'A ajoute une rue parcourue');

const passageA = await A.client.from('passages_jours').insert({ segment_id: SEGMENT, jour: JOUR }).select();
verifier(!passageA.error && passageA.data.length === 1, 'A ajoute un jour de passage');

const statA = await A.client.from('stats_jours').insert({ jour: JOUR, metres: 1234, pas: 5678 }).select();
verifier(!statA.error && statA.data.length === 1, 'A ajoute ses stats du jour');

const lectureA = await A.client.from('cartes_debloquees').select().eq('lieu_id', LIEU);
verifier(lectureA.data?.length === 1, 'A relit sa carte');

// B ne doit rien voir ni rien toucher.
const lectureB = await B.client.from('cartes_debloquees').select().eq('user_id', A.id);
verifier(!lectureB.error && lectureB.data.length === 0, 'B ne voit pas les cartes de A');

for (const table of ['rues_parcourues', 'passages_jours', 'stats_jours']) {
  const lu = await B.client.from(table).select().eq('user_id', A.id);
  verifier(!lu.error && lu.data.length === 0, `B ne voit rien de A dans ${table}`);
}

const modifB = await B.client
  .from('cartes_debloquees')
  .update({ debloquee_le: '2000-01-01T00:00:00Z' })
  .eq('user_id', A.id)
  .select();
verifier(!modifB.error && modifB.data.length === 0, 'B ne peut pas modifier la carte de A');

const rueModifB = await B.client
  .from('rues_parcourues')
  .update({ nb_passages: 999 })
  .eq('user_id', A.id)
  .select();
verifier(!rueModifB.error && rueModifB.data.length === 0, 'B ne peut pas modifier les rues de A');

const supprB = await B.client.from('stats_jours').delete().eq('user_id', A.id).select();
verifier(!supprB.error && supprB.data.length === 0, 'B ne peut pas supprimer les stats de A');

const rueUsurpee = await B.client
  .from('rues_parcourues')
  .insert({ user_id: A.id, segment_id: '1-1', premiere_fois: quand, derniere_fois: quand, nb_passages: 1 });
verifier(Boolean(rueUsurpee.error), 'B ne peut pas ajouter de rue au nom de A');

// Le serveur refuse les valeurs absurdes, quelle que soit l'app qui écrit.
const segmentFaux = await A.client
  .from('rues_parcourues')
  .insert({ segment_id: 'rue de Rivoli', premiere_fois: quand, derniere_fois: quand, nb_passages: 1 });
verifier(Boolean(segmentFaux.error), 'Un identifiant de rue mal formé est refusé');

const tropDeMetres = await A.client.from('stats_jours').insert({ jour: '2024-01-03', metres: 5000000, pas: 0 });
verifier(Boolean(tropDeMetres.error), 'Une journée de 5 000 km est refusée');

// Plus aucune position brute sur le serveur (T22).
const pointsA = await A.client.from('points').select().limit(1);
verifier(Boolean(pointsA.error), "La table des points n'existe plus");

const usurpation = await B.client
  .from('cartes_debloquees')
  .insert({ user_id: A.id, lieu_id: 'usurpation', debloquee_le: quand });
verifier(Boolean(usurpation.error), 'B ne peut pas écrire au nom de A');

// Le visiteur sans compte n'a accès à rien.
const lectureVisiteur = await visiteur.from('cartes_debloquees').select();
verifier(
  Boolean(lectureVisiteur.error) || lectureVisiteur.data.length === 0,
  'Un visiteur sans compte ne voit aucune carte',
);
const ruesVisiteur = await visiteur.from('rues_parcourues').select();
verifier(
  Boolean(ruesVisiteur.error) || ruesVisiteur.data.length === 0,
  'Un visiteur sans compte ne voit aucune rue',
);
const ecritureVisiteur = await visiteur.from('stats_jours').insert({ jour: JOUR, metres: 1, pas: 1 });
verifier(Boolean(ecritureVisiteur.error), 'Un visiteur sans compte ne peut rien écrire');

// Les données de A sont intactes après les tentatives de B.
const verifA = await A.client.from('cartes_debloquees').select().eq('lieu_id', LIEU);
verifier(verifA.data?.[0]?.debloquee_le?.startsWith(quand.slice(0, 16)), 'La carte de A est intacte');
const verifRue = await A.client.from('rues_parcourues').select('nb_passages').eq('segment_id', SEGMENT);
verifier(verifRue.data?.[0]?.nb_passages === 1, 'La rue de A est intacte');
const verifStat = await A.client.from('stats_jours').select('metres').eq('jour', JOUR);
verifier(verifStat.data?.length === 1, 'Les stats de A sont toujours là');

// Nettoyage.
await A.client.from('cartes_debloquees').delete().eq('lieu_id', LIEU);
await A.client.from('rues_parcourues').delete().eq('segment_id', SEGMENT);
await A.client.from('passages_jours').delete().eq('segment_id', SEGMENT);
await A.client.from('stats_jours').delete().eq('jour', JOUR);

// Profils (T29). Les profils de test sont créés une fois et gardés : un profil ne se
// supprime pas depuis l'app, et changer de username bloquerait 30 jours. On ne touche
// donc qu'à la bio, et on vérifie les refus.
async function profilDeTest(compte, username) {
  const lu = await compte.client.from('profils').select('username').maybeSingle();
  if (lu.data) return lu.data.username;
  const cree = await compte.client.from('profils').insert({ username }).select('username');
  verifier(!cree.error, `${username} : profil de test créé`);
  return username;
}
const usernameA = await profilDeTest(A, 'test_rls_a');
await profilDeTest(B, 'test_rls_b');

const bioA = `Bio de test ${Date.now()}`;
const majA = await A.client.from('profils').update({ bio: bioA }).eq('user_id', A.id).select();
verifier(!majA.error && majA.data.length === 1, 'A modifie sa bio');

const profilAvuParB = await B.client.from('profils').select().eq('user_id', A.id);
verifier(!profilAvuParB.error && profilAvuParB.data.length === 0, 'B ne voit pas le profil de A');

const majParB = await B.client.from('profils').update({ bio: 'piraté' }).eq('user_id', A.id).select();
verifier(!majParB.error && majParB.data.length === 0, 'B ne peut pas modifier le profil de A');

const usurpProfil = await B.client.from('profils').insert({ user_id: A.id, username: 'usurpateur' });
verifier(Boolean(usurpProfil.error), 'B ne peut pas créer de profil au nom de A');

const photoForcee = await A.client.from('profils').update({ photo_cle: 'avatars/00000000-0000-0000-0000-000000000000.jpg' }).eq('user_id', A.id);
verifier(Boolean(photoForcee.error), "A ne peut pas choisir lui-même le fichier de sa photo");

const bioLongue = await A.client.from('profils').update({ bio: 'x'.repeat(151) }).eq('user_id', A.id);
verifier(Boolean(bioLongue.error), 'Une bio de 151 caractères est refusée');

const doublon = await B.client.from('profils').update({ username: usernameA.toUpperCase() }).eq('user_id', B.id);
verifier(doublon.error?.code === '23505', 'B ne peut pas prendre le username de A, même en majuscules');

const reserve = await B.client.from('profils').update({ username: 'Admin' }).eq('user_id', B.id);
verifier(Boolean(reserve.error), 'Un username réservé est refusé');

const tropCourt = await B.client.from('profils').update({ username: 'ab' }).eq('user_id', B.id);
verifier(Boolean(tropCourt.error), 'Un username de 2 caractères est refusé');

const profilVisiteur = await visiteur.from('profils').select();
verifier(Boolean(profilVisiteur.error) || profilVisiteur.data.length === 0, 'Un visiteur sans compte ne voit aucun profil');

const verifBio = await A.client.from('profils').select('bio').eq('user_id', A.id).single();
verifier(verifBio.data?.bio === bioA, 'Le profil de A est intact');

console.log(echecs === 0 ? '\nTout est bon.' : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
