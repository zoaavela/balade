import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { lieux } from '@/cartes/lieux';

import { traiterEntreeZone } from './enregistrer';

// Zones surveillées par iOS autour des lieux pas encore débloqués. iOS réveille l'app quand
// on entre dans l'une d'elles, même si elle a été fermée de force et que le GPS ne tourne plus.
// Très économe : c'est le téléphone qui surveille, avec le Wi-Fi et les antennes.
// iOS limite à 20 zones par app, c'est pile le nombre de lieux du MVP.

export const TACHE_ZONES = 'balade-lieux';

const ZONES_MAX = 20;
const RAYON_MIN = 100; // en dessous, iOS déclenche mal

TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(
  TACHE_ZONES,
  async ({ data, error }) => {
    if (error || !data) return;
    if (data.eventType === Location.GeofencingEventType.Enter && data.region.identifier) {
      traiterEntreeZone(data.region.identifier);
    }
  },
);

// Met à jour les zones d'après les cartes déjà débloquées.
export async function surveillerLieux(debloquees: Set<string>) {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status !== 'granted') return;
    const restants = lieux.filter((l) => !debloquees.has(l.id)).slice(0, ZONES_MAX);
    if (restants.length === 0) {
      await arreterZones();
      return;
    }
    await Location.startGeofencingAsync(
      TACHE_ZONES,
      restants.map((l) => ({
        identifier: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        radius: Math.max(l.rayon_m, RAYON_MIN),
        notifyOnEnter: true,
        notifyOnExit: false,
      })),
    );
  } catch {
    // Zones indisponibles : le suivi GPS débloque quand même les lieux.
  }
}

export async function arreterZones() {
  try {
    if (await Location.hasStartedGeofencingAsync(TACHE_ZONES)) {
      await Location.stopGeofencingAsync(TACHE_ZONES);
    }
  } catch {
    // Déjà arrêté.
  }
}
