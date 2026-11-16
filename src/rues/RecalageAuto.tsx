import { useEffect } from 'react';
import { AppState } from 'react-native';

import { recalerEnAttente } from './recaler';

// Recale les points en attente au démarrage et à chaque retour dans l'app :
// les anciens points une fois après la mise à jour, puis ceux arrivés en
// arrière-plan ou reçus par la synchronisation.
export function RecalageAuto() {
  useEffect(() => {
    const lancer = () => recalerEnAttente().catch((err) => console.warn('Recalage impossible', err));
    lancer();
    const abonnement = AppState.addEventListener('change', (statut) => {
      if (statut === 'active') lancer();
    });
    return () => abonnement.remove();
  }, []);
  return null;
}
