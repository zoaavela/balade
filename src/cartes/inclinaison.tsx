import { createContext, useContext, type ReactNode } from 'react';
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

// Inclinaison du téléphone, lue une seule fois pour toute l'app et partagée par les cartes.
// Le calcul tourne du côté de l'affichage (Reanimated), sans passer par le code de l'app :
// le reflet suit le geste sans à-coups, même avec vingt cartes à l'écran.

export type Inclinaison = { x: SharedValue<number>; y: SharedValue<number> };

const Contexte = createContext<Inclinaison | null>(null);

const SUIVI = 0.25; // vitesse à laquelle le reflet rattrape le geste (0 à 1)
const RETOUR = 0.004; // vitesse à laquelle la position de repos s'adapte à ta façon de tenir le téléphone (environ 8 s)

export function InclinaisonProvider({ children }: { children: ReactNode }) {
  const capteur = useAnimatedSensor(SensorType.GRAVITY, { interval: 33 });
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // Position de repos : la façon dont tu tiens le téléphone en ce moment.
  const reposX = useSharedValue<number | null>(null);
  const reposY = useSharedValue<number | null>(null);

  useAnimatedReaction(
    () => capteur.sensor.value,
    (g) => {
      const norme = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);
      if (norme === 0) return;
      // Direction de la gravité, entre -1 et 1, quelle que soit l'unité du capteur.
      const gx = g.x / norme;
      const gy = g.y / norme;
      if (reposX.value === null || reposY.value === null) {
        reposX.value = gx;
        reposY.value = gy;
      }
      reposX.value += (gx - reposX.value) * RETOUR;
      reposY.value += (gy - reposY.value) * RETOUR;
      // Écart par rapport au repos, limité pour que le reflet ne sorte pas de la carte.
      const ecartX = Math.max(-1, Math.min(1, (gx - reposX.value) * 2.5));
      const ecartY = Math.max(-1, Math.min(1, (gy - reposY.value) * 2.5));
      x.value += (ecartX - x.value) * SUIVI;
      y.value += (ecartY - y.value) * SUIVI;
    },
  );

  return <Contexte.Provider value={{ x, y }}>{children}</Contexte.Provider>;
}

// Null hors du fournisseur (par exemple sur l'écran d'accueil) : le reflet reste alors fixe.
export function useInclinaison(): Inclinaison | null {
  return useContext(Contexte);
}
