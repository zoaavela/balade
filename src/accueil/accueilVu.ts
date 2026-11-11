import { useSyncExternalStore } from 'react';

import { ecrireReglage, effacerReglage, lireReglage } from '@/db/reglages';

// Retient si l'accueil a déjà été vu. Lu dans la base une seule fois, puis gardé en mémoire.
const CLE = 'accueil_vu';
let vu: boolean | null = null;
const ecouteurs = new Set<() => void>();

function lire(): boolean {
  if (vu === null) vu = lireReglage(CLE) === '1';
  return vu;
}

export function marquerAccueilVu(valeur: boolean) {
  if (valeur) ecrireReglage(CLE, '1');
  else effacerReglage(CLE);
  vu = valeur;
  ecouteurs.forEach((prevenir) => prevenir());
}

export function useAccueilVu(): boolean {
  return useSyncExternalStore((prevenir) => {
    ecouteurs.add(prevenir);
    return () => ecouteurs.delete(prevenir);
  }, lire);
}
