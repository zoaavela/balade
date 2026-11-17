import { useEffect, useState } from 'react';

import { ecrireReglage, lireReglage, effacerReglage } from '@/db/reglages';

import { supabase } from './supabase';

// Profil public du compte (T29) : username, bio, photo. Stocké sur Supabase, table profils.
// Les règles (unicité, mots réservés, 30 jours, 150 caractères) sont vérifiées par le
// serveur. Celles d'ici ne servent qu'à prévenir plus tôt, avec un message clair.

export type Profil = {
  username: string;
  bio: string;
  aPhoto: boolean;
  usernameModifieLe: Date | null;
};

export const BIO_MAX = 150;
const FORMAT = /^[A-Za-z0-9._]{3,20}$/;
const DELAI_USERNAME_MS = 30 * 24 * 60 * 60 * 1000;

// Message à afficher si le username ne convient pas, null sinon.
export function problemeUsername(u: string): string | null {
  if (u.length < 3) return 'Au moins 3 caractères.';
  if (u.length > 20) return '20 caractères au plus.';
  if (!FORMAT.test(u)) return 'Seulement des lettres sans accent, des chiffres, le point et le tiret bas.';
  if (u.startsWith('.') || u.endsWith('.') || u.includes('..')) return 'Pas de point au début, à la fin, ni deux à la suite.';
  return null;
}

// Date à partir de laquelle le username peut changer à nouveau, null si c'est déjà possible.
export function usernameBloqueJusquA(p: Profil): Date | null {
  if (!p.usernameModifieLe) return null;
  const fin = new Date(p.usernameModifieLe.getTime() + DELAI_USERNAME_MS);
  return fin > new Date() ? fin : null;
}

type Ligne = { username: string; bio: string; photo_cle: string | null; username_modifie_le: string | null };

function versProfil(l: Ligne): Profil {
  return {
    username: l.username,
    bio: l.bio,
    aPhoto: l.photo_cle !== null,
    usernameModifieLe: l.username_modifie_le ? new Date(l.username_modifie_le) : null,
  };
}

// null : pas encore de profil. Lève une erreur si le serveur ne répond pas.
export async function lireProfil(): Promise<Profil | null> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data, error } = await supabase
    .from('profils')
    .select('username, bio, photo_cle, username_modifie_le')
    .maybeSingle<Ligne>();
  if (error) throw error;
  if (data) retenirUsername(data.username);
  return data ? versProfil(data) : null;
}

// Renvoie null si c'est enregistré, sinon le message d'erreur à afficher.
export async function creerProfil(username: string): Promise<string | null> {
  if (!supabase) return 'Pas de connexion au serveur.';
  const { error } = await supabase.from('profils').insert({ username });
  if (error) return messageErreur(error);
  retenirUsername(username);
  return null;
}

export async function modifierProfil(champs: { username?: string; bio?: string }): Promise<string | null> {
  if (!supabase) return 'Pas de connexion au serveur.';
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user.id;
  if (!id) return 'Session expirée, reconnecte-toi.';
  const { error } = await supabase.from('profils').update(champs).eq('user_id', id);
  if (error) return messageErreur(error);
  if (champs.username) retenirUsername(champs.username);
  return null;
}

function messageErreur(e: { code?: string; message?: string }): string {
  if (e.code === '23505') return 'Ce username est déjà pris.';
  if (e.message?.includes('username_reserve')) return 'Ce username est réservé.';
  if (e.message?.includes('username_30_jours')) return 'Tu ne peux changer de username qu’une fois tous les 30 jours.';
  if (e.code === '23514') return 'Ce texte ne respecte pas les règles.';
  return 'Le serveur ne répond pas. Réessaie dans un moment.';
}

// Le username est retenu sur le téléphone : l'app n'a pas besoin du réseau pour savoir
// qu'il est déjà choisi, et ne redemande pas l'écran à chaque lancement hors ligne.
const cle = (id: string) => `username_${id}`;
let compteCourant: string | null = null;

export function choisirCompteProfil(id: string) {
  compteCourant = id;
}

function retenirUsername(u: string) {
  if (compteCourant) ecrireReglage(cle(compteCourant), u);
}

export function usernameRetenu(id: string): string | null {
  return lireReglage(cle(id));
}

// Après la suppression du compte : le téléphone ne garde rien de lui.
export function oublierUsername(id: string) {
  effacerReglage(cle(id));
}

// Pour les écrans : le profil, relu à la demande.
export function useProfil(): { profil: Profil | null | undefined; relire: () => void } {
  const [profil, setProfil] = useState<Profil | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let actif = true;
    lireProfil()
      .then((p) => actif && setProfil(p))
      .catch(() => actif && setProfil((avant) => avant ?? null));
    return () => {
      actif = false;
    };
  }, [version]);
  return { profil, relire: () => setVersion((v) => v + 1) };
}
