import { Pedometer } from 'expo-sensors';

import { baseCompte } from '@/db/base';
import { debutDuJour, jourSuivant } from '@/trajets/jours';

// Pas comptés par le capteur de mouvement de l'iPhone (le même que l'app Santé utilise
// pour les pas du téléphone). Il ne garde que les 7 derniers jours : l'app recopie chaque
// journée dans la base locale pour garder le total au-delà.

const JOURS_GARDES_PAR_IPHONE = 7;

export type Pas = { aujourdhui: number; total: number };

function cle(d: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

// Null si le capteur est absent ou l'autorisation refusée.
export async function lirePas(): Promise<Pas | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const { granted } = await Pedometer.requestPermissionsAsync();
    if (!granted) return null;

    const base = baseCompte();
    const maintenant = new Date();
    const aujourdhui = debutDuJour(maintenant);
    let pasDuJour = 0;

    for (let i = 0; i < JOURS_GARDES_PAR_IPHONE; i++) {
      const debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - i);
      const fin = i === 0 ? maintenant : jourSuivant(debut);
      const { steps } = await Pedometer.getStepCountAsync(debut, fin);
      if (i === 0) pasDuJour = steps;
      // On garde la plus grande valeur vue pour ce jour : le compteur ne fait que monter.
      base.runSync(
        `INSERT INTO pas_jours (jour, pas) VALUES (?, ?)
         ON CONFLICT (jour) DO UPDATE SET pas = max(pas, excluded.pas)`,
        [cle(debut), steps],
      );
    }

    const total =
      base.getFirstSync<{ total: number | null }>('SELECT sum(pas) AS total FROM pas_jours', [])
        ?.total ?? 0;
    return { aujourdhui: pasDuJour, total };
  } catch {
    return null;
  }
}

// 12 480 : espace fine entre les milliers, à la française.
export function formaterPas(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
