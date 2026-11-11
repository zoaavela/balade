import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { distanceEntre } from '@/balade/mesures';
import { ecrireReglage, lireReglage } from '@/db/reglages';

import { traiterPositions } from './enregistrer';

// Suivi en arrière-plan, économe en batterie. Deux régimes :
// - veille : position approximative (Wi-Fi, antennes), très peu gourmande, juste pour
//   remarquer qu'on se met en route ;
// - marche : GPS précis, tant qu'on bouge. Après quelques minutes sur place, retour en veille.
// Ce fichier doit être chargé au démarrage de l'app : iOS peut la réveiller sans écran
// pour lui donner des positions, et la tâche doit alors déjà être déclarée.

export const TACHE_SUIVI = 'balade-suivi';

type Regime = 'veille' | 'marche';

const DEPART = 150; // mètres parcourus en veille qui font passer en marche
const VITESSE_DEPART = 0.8; // m/s, un pas tranquille
const BOUGE = 30; // mètres : en dessous, on considère qu'on est resté sur place
const ARRET = 4 * 60 * 1000; // sur place depuis 4 minutes : retour en veille

type Ancre = { latitude: number; longitude: number; t: number };

function options(regime: Regime): Location.LocationTaskOptions {
  const communes = {
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false, // c'est nous qui décidons quand passer en veille
    showsBackgroundLocationIndicator: false,
  };
  return regime === 'marche'
    ? // Toutes les positions arrivent : c'est ce qui permet de voir qu'on s'est arrêté.
      // Le tri à 15 mètres est fait par traiterPositions.
      { ...communes, accuracy: Location.Accuracy.High, distanceInterval: 0 }
    : { ...communes, accuracy: Location.Accuracy.Balanced, distanceInterval: 100 };
}

function lireRegime(): Regime {
  return lireReglage('suivi_regime') === 'marche' ? 'marche' : 'veille';
}

function lireAncre(): Ancre | null {
  try {
    const brut = lireReglage('suivi_ancre');
    return brut ? (JSON.parse(brut) as Ancre) : null;
  } catch {
    return null;
  }
}

async function passerEn(regime: Regime) {
  ecrireReglage('suivi_regime', regime);
  await Location.startLocationUpdatesAsync(TACHE_SUIVI, options(regime));
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TACHE_SUIVI, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const positions = data.locations;
  traiterPositions(positions);

  // Choix du régime d'après la dernière position.
  const derniere = positions.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
  const ici = { latitude: derniere.coords.latitude, longitude: derniere.coords.longitude };
  const vitesse = derniere.coords.speed ?? 0;
  // L'ancre : le dernier endroit où l'on a bougé, et quand.
  const ancre = lireAncre();
  const poserAncre = () =>
    ecrireReglage('suivi_ancre', JSON.stringify({ ...ici, t: derniere.timestamp }));
  if (!ancre) {
    poserAncre();
    return;
  }
  const ecart = distanceEntre(ancre, ici);

  if (lireRegime() === 'veille') {
    // En veille, l'ancre reste là où l'on s'est arrêté : s'en éloigner, c'est repartir.
    if (ecart > DEPART || vitesse > VITESSE_DEPART) {
      poserAncre();
      await passerEn('marche');
    }
  } else if (ecart > BOUGE) {
    poserAncre(); // on avance
  } else if (derniere.timestamp - ancre.t > ARRET) {
    await passerEn('veille'); // sur place depuis un moment
  }
});

// Lance le suivi en arrière-plan s'il ne tourne pas déjà. Demande l'autorisation « Toujours ».
export async function demarrerSuiviFond(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return false;
  if (!(await Location.hasStartedLocationUpdatesAsync(TACHE_SUIVI))) {
    // Au démarrage on part en marche : si on est déjà à l'arrêt, la veille revient vite.
    ecrireReglage('suivi_regime', 'marche');
    await Location.startLocationUpdatesAsync(TACHE_SUIVI, options('marche'));
  }
  return true;
}

export async function arreterSuiviFond() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TACHE_SUIVI)) {
      await Location.stopLocationUpdatesAsync(TACHE_SUIVI);
    }
  } catch {
    // Déjà arrêté.
  }
}
