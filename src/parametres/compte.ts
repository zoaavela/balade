import { supabase } from '@/compte/supabase';

// Actions de la section Compte des paramètres (T32).

function client() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Changement d'adresse e-mail : Supabase envoie un code à l'ancienne adresse et un code à la
// nouvelle. Le changement n'a lieu qu'une fois les deux codes vérifiés.
export async function demanderChangementEmail(nouvelle: string): Promise<string | null> {
  const adresse = nouvelle.trim().toLowerCase();
  if (!ADRESSE.test(adresse)) return "Cette adresse n'a pas l'air valide.";
  const { error } = await client().auth.updateUser({ email: adresse });
  if (!error) return null;
  if (error.status === 429) return 'Trop de demandes. Réessaie dans une heure.';
  if (/already|registered|exists/i.test(error.message)) return 'Cette adresse est déjà utilisée par un autre compte.';
  return "La demande n'est pas passée. Réessaie dans un moment.";
}

export async function verifierCodeEmail(adresse: string, code: string): Promise<string | null> {
  const { error } = await client().auth.verifyOtp({
    email: adresse.trim().toLowerCase(),
    token: code.trim(),
    type: 'email_change',
  });
  return error ? `Code refusé pour ${adresse}. Vérifie-le ou redemande un code.` : null;
}

export type Appareil = { id: string; nom: string; vueLe: Date; actuel: boolean };

// Les sessions ouvertes du compte, calculées par la base (fonction mes_sessions).
export async function lireAppareils(): Promise<Appareil[]> {
  const { data, error } = await client().rpc('mes_sessions');
  if (error) throw error;
  return (data as { id: string; appareil: string; vue_le: string; actuelle: boolean }[]).map((s) => ({
    id: s.id,
    nom: nomAppareil(s.appareil),
    vueLe: new Date(s.vue_le),
    actuel: s.actuelle,
  }));
}

// Le navigateur ou l'app qui a ouvert la session, en mots simples.
function nomAppareil(agent: string): string {
  if (/iPhone|iOS|Darwin|CFNetwork/i.test(agent)) return 'iPhone';
  if (/iPad/i.test(agent)) return 'iPad';
  if (/Android|okhttp/i.test(agent)) return 'Android';
  if (/Windows/i.test(agent)) return 'Ordinateur Windows';
  if (/Macintosh|Mac OS/i.test(agent)) return 'Mac';
  if (/node|undici/i.test(agent)) return 'Script de test';
  return 'Appareil inconnu';
}

// Ferme toutes les sessions du compte, celle-ci comprise.
export async function deconnecterPartout(): Promise<void> {
  const { error } = await client().auth.signOut({ scope: 'global' });
  if (error) throw error;
}

// Suppression réelle par la fonction supprimer-compte : photos R2, puis compte et
// toutes ses lignes. Renvoie null si c'est fait, sinon le message à afficher.
export async function supprimerCompte(): Promise<string | null> {
  const { data, error } = await client().functions.invoke('supprimer-compte', {
    body: { confirmation: 'SUPPRIMER' },
  });
  if (error || !data?.ok) return "La suppression n'a pas abouti. Vérifie ta connexion et réessaie.";
  return null;
}
