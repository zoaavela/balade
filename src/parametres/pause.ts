import { useEffect, useState } from 'react';

import { effacerReglage, ecrireReglage, lireReglage } from '@/db/reglages';

// Mode pause du suivi (T32) : pendant la pause, rien n'est enregistré ni débloqué.
// Réglage du téléphone : une heure, une journée, ou jusqu'à ce qu'on reprenne.

const CLE = 'pause_jusqua'; // millisecondes depuis 1970, ou « toujours »

export type Pause = { jusqua: Date | 'toujours' } | null;
export type DureePause = 'heure' | 'jour' | 'toujours';

const abonnes = new Set<(p: Pause) => void>();

export function lirePause(): Pause {
  const v = lireReglage(CLE);
  if (!v) return null;
  if (v === 'toujours') return { jusqua: 'toujours' };
  const fin = Number(v);
  if (!Number.isFinite(fin) || fin <= Date.now()) return null;
  return { jusqua: new Date(fin) };
}

export function enPause(): boolean {
  return lirePause() !== null;
}

export function mettreEnPause(duree: DureePause) {
  const maintenant = Date.now();
  const valeur =
    duree === 'toujours' ? 'toujours' : String(maintenant + (duree === 'heure' ? 3600_000 : 24 * 3600_000));
  ecrireReglage(CLE, valeur);
  prevenir();
}

export function reprendreSuivi() {
  effacerReglage(CLE);
  prevenir();
}

function prevenir() {
  const p = lirePause();
  abonnes.forEach((f) => f(p));
}

// La pause en cours, mise à jour quand elle change ou qu'elle se termine toute seule.
export function usePause(): Pause {
  const [pause, setPause] = useState<Pause>(lirePause);
  useEffect(() => {
    abonnes.add(setPause);
    const minuteur = setInterval(() => setPause(lirePause()), 30_000);
    return () => {
      abonnes.delete(setPause);
      clearInterval(minuteur);
    };
  }, []);
  return pause;
}

export function decrirePause(p: NonNullable<Pause>): string {
  if (p.jusqua === 'toujours') return "Suivi en pause jusqu'à ce que tu le reprennes.";
  const d = p.jusqua;
  const heure = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  const demain = d.toDateString() !== new Date().toDateString();
  return `Suivi en pause jusqu'à ${demain ? 'demain ' : ''}${heure}.`;
}
