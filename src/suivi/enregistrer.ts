import type { LocationObject } from 'expo-location';
import { AppState } from 'react-native';

import { distanceEntre, type Point } from '@/balade/mesures';
import { lieuxPlaces, type Lieu } from '@/cartes/lieux';
import { baseCompte, utiliserCompte } from '@/db/base';
import { cartesDebloquees, debloquer } from '@/db/cartes';
import { ajouterPoint, type PointDate } from '@/db/points';
import { ecrireReglage, effacerReglage, lireReglage } from '@/db/reglages';
import { lieuxAtteints } from '@/deblocage/lieuxAtteints';
import { signalerSecretsProches } from '@/deblocage/secretsProches';
import { enPause } from '@/parametres/pause';
import { dansUneZone, lireZones } from '@/parametres/zones';
import { recalerEnAttente } from '@/rues/recaler';

import { defis, estTermine } from '@/defis/defis';

import { annoncerCartes, annoncerDefis, annoncerPoints } from './evenements';
import { notifierNouvelleCarte } from './notifications';

// Le cœur du suivi, appelé pour chaque lot de positions, que l'app soit à l'écran ou non :
// enregistre les points valables et débloque les lieux atteints.

const PRECISION_MAX = 30; // mètres : au-delà, le point est jeté pour éviter les zigzags
const ECART_MIN = 15; // mètres entre deux points enregistrés

// Compte connecté, retenu sur l'appareil pour que le suivi en arrière-plan sache
// dans quelle base écrire, même quand l'app est réveillée sans écran.
const CLE_COMPTE = 'compte_actif';

export function retenirCompte(id: string) {
  if (lireReglage(CLE_COMPTE) !== id) ecrireReglage(CLE_COMPTE, id);
}

export function oublierCompte() {
  effacerReglage(CLE_COMPTE);
}

// Choisit la base du compte connecté. False si personne n'est connecté : on n'enregistre rien.
function ouvrirCompteActif(): boolean {
  const id = lireReglage(CLE_COMPTE);
  if (!id) return false;
  utiliserCompte(id);
  return true;
}

function dernierPoint(): Point | null {
  return (
    baseCompte().getFirstSync<Point>(
      'SELECT latitude, longitude FROM points ORDER BY horodatage DESC LIMIT 1',
      [],
    ) ?? null
  );
}

export function traiterPositions(positions: LocationObject[]) {
  if (enPause()) return; // mode pause (T32) : rien n'est enregistré ni débloqué
  if (!ouvrirCompteActif()) return;

  const zones = lireZones();
  let precedent = dernierPoint();
  const nouveaux: PointDate[] = [];
  // Points dans une zone privée : jamais enregistrés, seulement utilisés pour débloquer.
  const prives: PointDate[] = [];
  for (const position of [...positions].sort((a, b) => a.timestamp - b.timestamp)) {
    const { latitude, longitude, accuracy } = position.coords;
    if (accuracy == null || accuracy > PRECISION_MAX) continue;
    const point = { latitude, longitude };
    const horodatage = Math.round(position.timestamp);
    if (dansUneZone(point, zones)) {
      prives.push({ latitude, longitude, horodatage });
      continue;
    }
    if (precedent && distanceEntre(precedent, point) < ECART_MIN) continue;
    ajouterPoint({ latitude, longitude, precision_m: accuracy, horodatage });
    nouveaux.push({ latitude, longitude, horodatage });
    precedent = point;
  }
  if (nouveaux.length === 0 && prives.length === 0) return;

  if (nouveaux.length > 0) {
    annoncerPoints(nouveaux);
    // Recalage sur les rues en tâche de fond : le déblocage, lui, utilise les points bruts.
    recalerEnAttente().catch((err) => console.warn('Recalage impossible', err));
  }
  const debloques = new Set(cartesDebloquees().keys());
  const atteints = new Map<string, Lieu>();
  for (const point of [...nouveaux, ...prives]) {
    for (const lieu of lieuxAtteints(point, debloques)) atteints.set(lieu.id, lieu);
  }
  enregistrerDeblocages([...atteints.values()]);
  signalerSecretsProches([...nouveaux, ...prives], new Set(cartesDebloquees().keys()));
}

// Appelé quand iOS signale l'entrée dans la zone d'un lieu (voir zones.ts).
export function traiterEntreeZone(lieuId: string) {
  if (enPause() || !ouvrirCompteActif()) return;
  const lieu = lieuxPlaces.find((l) => l.id === lieuId);
  // Avec un contour réel, le cercle surveillé par iOS est plus large que le lieu :
  // c'est le suivi GPS qui débloquera, une fois vraiment dedans.
  if (lieu && !lieu.emplacement.contour) enregistrerDeblocages([lieu]);
}

// Écrit les déblocages, puis les montre : écran « Nouveau timbre » si l'app est ouverte,
// notification sinon. Renvoie les lieux vraiment nouveaux.
export function enregistrerDeblocages(candidats: Lieu[]): Lieu[] {
  if (candidats.length === 0) return [];
  const date = new Date();
  const avant = new Set(cartesDebloquees().keys());
  const nouveaux = candidats.filter((lieu) => debloquer(lieu.id, date));
  if (nouveaux.length === 0) return [];
  // Les défis que ces cartes viennent de terminer, montrés après les cartes.
  const apres = new Set([...avant, ...nouveaux.map((l) => l.id)]);
  const termines = defis.filter((d) => !estTermine(d, avant) && estTermine(d, apres));
  // Les écrans affichent la carte à la prochaine ouverture s'ils sont en mémoire.
  const ecranPret = annoncerCartes(nouveaux, date);
  if (termines.length > 0) annoncerDefis(termines);
  // Téléphone dans la poche : on prévient aussi par une notification.
  if (!ecranPret || AppState.currentState !== 'active') {
    nouveaux.forEach((lieu) => notifierNouvelleCarte(lieu));
  }
  return nouveaux;
}
