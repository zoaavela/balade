import { useEffect, useState } from 'react';

import { supabase } from '@/compte/supabase';
import { baseCompte } from '@/db/base';
import { ecrireEtat, lireEtat } from '@/db/rues';

// Réglages de confidentialité (T32), stockés sur le serveur, table confidentialite :
// ils décideront de ce que les autres peuvent lire (fonction profil_ami du T33).
// Le téléphone en garde une copie pour les afficher sans réseau.

export type Confidentialite = {
  profil_public: boolean;
  demandes_ouvertes: boolean;
  dans_recherche: boolean;
  montrer_timbres: boolean;
  montrer_defis: boolean;
  montrer_quartiers: boolean;
  montrer_stats: boolean;
};

export const DEFAUTS: Confidentialite = {
  profil_public: false,
  demandes_ouvertes: true,
  dans_recherche: true,
  montrer_timbres: true,
  montrer_defis: true,
  montrer_quartiers: true,
  montrer_stats: true,
};

const CLES = Object.keys(DEFAUTS) as (keyof Confidentialite)[];
const CLE_COPIE = 'confidentialite';

function lireCopie(): Confidentialite {
  try {
    const texte = lireEtat(baseCompte(), CLE_COPIE);
    return texte ? { ...DEFAUTS, ...(JSON.parse(texte) as Partial<Confidentialite>) } : DEFAUTS;
  } catch {
    return DEFAUTS;
  }
}

function garderCopie(c: Confidentialite) {
  ecrireEtat(baseCompte(), CLE_COPIE, JSON.stringify(c));
}

async function lireServeur(): Promise<Confidentialite> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data, error } = await supabase.from('confidentialite').select(CLES.join(', ')).maybeSingle();
  if (error) throw error;
  // Pas encore de ligne : les réglages par défaut s'appliquent.
  const lu = data ? { ...DEFAUTS, ...(data as unknown as Partial<Confidentialite>) } : DEFAUTS;
  garderCopie(lu);
  return lu;
}

// Change un réglage sur le serveur. Renvoie les réglages à jour, ou lève une erreur.
export async function changerConfidentialite(
  actuels: Confidentialite,
  changement: Partial<Confidentialite>,
): Promise<Confidentialite> {
  if (!supabase) throw new Error('Supabase non configuré');
  const nouveaux = { ...actuels, ...changement };
  const { error } = await supabase.from('confidentialite').upsert(nouveaux, { onConflict: 'user_id' });
  if (error) throw error;
  garderCopie(nouveaux);
  return nouveaux;
}

// horsLigne : la copie du téléphone est affichée, le serveur n'a pas répondu.
export function useConfidentialite() {
  const [reglages, setReglages] = useState<Confidentialite>(lireCopie);
  const [horsLigne, setHorsLigne] = useState(false);
  useEffect(() => {
    let actif = true;
    lireServeur()
      .then((c) => actif && (setReglages(c), setHorsLigne(false)))
      .catch(() => actif && setHorsLigne(true));
    return () => {
      actif = false;
    };
  }, []);
  return { reglages, setReglages, horsLigne };
}
