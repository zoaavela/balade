import * as Location from 'expo-location';

// Première position pour centrer la carte (T31).
//
// Sur iPhone, getCurrentPositionAsync peut ne jamais répondre, surtout au premier
// lancement ou après un long moment sans GPS : l'écran restait alors bloqué sur
// « On cherche ta position ». On lance donc trois pistes à la fois et on garde la
// première qui répond : la dernière position connue si elle est récente, le flux
// continu de positions (le plus fiable sur iOS) et une demande ponctuelle. Au bout
// du délai, on abandonne et l'écran l'explique.

const AGE_MAX_MS = 10 * 60 * 1000; // une position de moins de 10 minutes suffit pour centrer

export async function premierePosition(delaiMs: number): Promise<Location.LocationObject | null> {
  const recente = await Location.getLastKnownPositionAsync({ maxAge: AGE_MAX_MS }).catch(() => null);
  if (recente) return recente;

  let abonnement: Location.LocationSubscription | null = null;
  let fini = false;
  let minuterie: ReturnType<typeof setTimeout> | undefined;

  const resultat = await new Promise<Location.LocationObject | null>((resoudre) => {
    const terminer = (p: Location.LocationObject | null) => {
      if (fini) return;
      fini = true;
      resoudre(p);
    };
    minuterie = setTimeout(() => terminer(null), delaiMs);
    Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced }, (p) => terminer(p))
      .then((a) => {
        if (fini) a.remove();
        else abonnement = a;
      })
      .catch(() => {});
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(terminer)
      .catch(() => {});
  });

  clearTimeout(minuterie);
  (abonnement as Location.LocationSubscription | null)?.remove();
  return resultat;
}
