import { useSyncExternalStore } from 'react';

// État de la dernière synchronisation, affiché dans le Profil.
export type StatutSynchro =
  | { etat: 'jamais' }
  | { etat: 'en-cours' }
  | { etat: 'ok'; le: Date }
  | { etat: 'hors-ligne'; dernierOk?: Date };

let statut: StatutSynchro = { etat: 'jamais' };
const ecouteurs = new Set<() => void>();

export function changerStatut(nouveau: StatutSynchro) {
  statut = nouveau;
  ecouteurs.forEach((prevenir) => prevenir());
}

export function lireStatut(): StatutSynchro {
  return statut;
}

export function useStatutSynchro(): StatutSynchro {
  return useSyncExternalStore((prevenir) => {
    ecouteurs.add(prevenir);
    return () => ecouteurs.delete(prevenir);
  }, lireStatut);
}
