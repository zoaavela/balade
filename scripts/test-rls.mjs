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
await A.client.from('points').delete().eq('precision_m', 999);

const carteA = await A.client
  .from('cartes_debloquees')
  .insert({ lieu_id: LIEU, debloquee_le: quand })
  .select();
verifier(!carteA.error && carteA.data.length === 1, 'A ajoute sa carte');

const pointA = await A.client
  .from('points')
  .insert({ latitude: 48.8584, longitude: 2.2945, precision_m: 999, horodatage: quand })
  .select();
verifier(!pointA.error && pointA.data.length === 1, 'A ajoute son point');
const idPoint = pointA.data?.[0]?.id;

const lectureA = await A.client.from('cartes_debloquees').select().eq('lieu_id', LIEU);
verifier(lectureA.data?.length === 1, 'A relit sa carte');

// B ne doit rien voir ni rien toucher.
const lectureB = await B.client.from('cartes_debloquees').select().eq('user_id', A.id);
verifier(!lectureB.error && lectureB.data.length === 0, 'B ne voit pas les cartes de A');

const pointsB = await B.client.from('points').select().eq('user_id', A.id);
verifier(!pointsB.error && pointsB.data.length === 0, 'B ne voit pas les points de A');

const modifB = await B.client
  .from('cartes_debloquees')
  .update({ debloquee_le: '2000-01-01T00:00:00Z' })
  .eq('user_id', A.id)
  .select();
verifier(!modifB.error && modifB.data.length === 0, 'B ne peut pas modifier la carte de A');

const supprB = await B.client.from('points').delete().eq('id', idPoint).select();
verifier(!supprB.error && supprB.data.length === 0, 'B ne peut pas supprimer le point de A');

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
const ecritureVisiteur = await visiteur
  .from('points')
  .insert({ latitude: 0, longitude: 0, precision_m: 1, horodatage: quand });
verifier(Boolean(ecritureVisiteur.error), 'Un visiteur sans compte ne peut rien écrire');

// Les données de A sont intactes après les tentatives de B.
const verifA = await A.client.from('cartes_debloquees').select().eq('lieu_id', LIEU);
verifier(verifA.data?.[0]?.debloquee_le?.startsWith(quand.slice(0, 16)), 'La carte de A est intacte');
const verifPoint = await A.client.from('points').select().eq('id', idPoint);
verifier(verifPoint.data?.length === 1, 'Le point de A est toujours là');

// Nettoyage.
await A.client.from('cartes_debloquees').delete().eq('lieu_id', LIEU);
await A.client.from('points').delete().eq('id', idPoint);

console.log(echecs === 0 ? '\nTout est bon.' : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
