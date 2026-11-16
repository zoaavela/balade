import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';

import { distanceEntre, type Point } from '@/balade/mesures';
import { lieuxPlaces } from '@/cartes/lieux';

import { secretsReveles } from './visibilite';

// À moins de 200 m d'un lieu secret pas encore trouvé, le téléphone vibre légèrement,
// sans dire où ni quoi. Au plus une fois par lieu et par heure.

const DISTANCE_M = 200;
const DELAI_MS = 60 * 60 * 1000;
const derniereVibration = new Map<string, number>();

export function signalerSecretsProches(points: Point[], debloques: ReadonlySet<string>) {
  // Une vibration ne se sent que téléphone en main, app ouverte.
  if (AppState.currentState !== 'active') return;
  const reveles = secretsReveles();
  const maintenant = Date.now();
  let vibrer = false;
  for (const lieu of lieuxPlaces) {
    if (lieu.rarete !== 'secret' || debloques.has(lieu.id) || reveles.has(lieu.id)) continue;
    const dernier = derniereVibration.get(lieu.id);
    if (dernier !== undefined && maintenant - dernier < DELAI_MS) continue;
    // Compté depuis le bord du lieu, à peu près : son cercle de déblocage, ou le cercle
    // qui contient son contour (île, square).
    const e = lieu.emplacement;
    if (points.some((p) => distanceEntre(p, e) - e.rayon_m <= DISTANCE_M)) {
      derniereVibration.set(lieu.id, maintenant);
      vibrer = true;
    }
  }
  if (vibrer) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
