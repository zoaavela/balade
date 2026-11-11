import { ouvrirBase } from './base';

// Petits réglages de l'app, rangés par clé (par exemple : accueil déjà vu).

export function lireReglage(cle: string): string | null {
  const ligne = ouvrirBase().getFirstSync<{ valeur: string }>(
    'SELECT valeur FROM reglages WHERE cle = ?',
    [cle],
  );
  return ligne?.valeur ?? null;
}

export function ecrireReglage(cle: string, valeur: string) {
  ouvrirBase().runSync('INSERT OR REPLACE INTO reglages (cle, valeur) VALUES (?, ?)', [cle, valeur]);
}

export function effacerReglage(cle: string) {
  ouvrirBase().runSync('DELETE FROM reglages WHERE cle = ?', [cle]);
}
