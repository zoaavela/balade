import { ouvrirBase } from './base';

// Enregistre le déblocage d'un lieu. Renvoie true si c'est nouveau, false s'il l'était déjà.
export function debloquer(lieuId: string, date: Date): boolean {
  const resultat = ouvrirBase().runSync(
    'INSERT OR IGNORE INTO cartes_debloquees (lieu_id, debloquee_le) VALUES (?, ?)',
    [lieuId, date.getTime()],
  );
  return resultat.changes > 0;
}

// Toutes les cartes débloquées, avec leur date.
export function cartesDebloquees(): Map<string, Date> {
  const lignes = ouvrirBase().getAllSync<{ lieu_id: string; debloquee_le: number }>(
    'SELECT lieu_id, debloquee_le FROM cartes_debloquees',
    [],
  );
  return new Map(lignes.map((l) => [l.lieu_id, new Date(l.debloquee_le)]));
}
