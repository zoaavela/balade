import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDeblocage } from '@/deblocage/Deblocage';
import { option } from '@/parametres/options';

import { synchroniser } from './synchro';

const INTERVALLE = 60 * 1000; // une tentative par minute tant que l'app est ouverte

// Lance la synchronisation au démarrage, à chaque retour dans l'app, puis chaque minute.
// Sans réseau, la tentative échoue en silence et la suivante reprend là où on en était.
export function SynchroAuto({ userId }: { userId: string }) {
  const { rafraichir } = useDeblocage();

  useEffect(() => {
    let actif = AppState.currentState === 'active';
    const lancer = async () => {
      if (!actif) return;
      if (option('synchro_wifi') && !(await enWifi())) return; // réglage « seulement en Wi-Fi »
      if (await synchroniser(userId)) rafraichir();
    };

    lancer();
    const minuteur = setInterval(lancer, INTERVALLE);
    const abonnement = AppState.addEventListener('change', (statut) => {
      actif = statut === 'active';
      if (actif) lancer();
    });
    return () => {
      clearInterval(minuteur);
      abonnement.remove();
    };
  }, [userId, rafraichir]);

  return null;
}

async function enWifi(): Promise<boolean> {
  try {
    const etat = await Network.getNetworkStateAsync();
    return etat.type === Network.NetworkStateType.WIFI;
  } catch {
    return false;
  }
}
