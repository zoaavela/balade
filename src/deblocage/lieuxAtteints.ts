import { distanceEntre, type Point } from '@/balade/mesures';
import { lieux, type Lieu } from '@/cartes/lieux';

// Les lieux pas encore débloqués dont le cercle contient ce point.
export function lieuxAtteints(point: Point, dejaDebloques: Set<string>): Lieu[] {
  return lieux.filter(
    (lieu) => !dejaDebloques.has(lieu.id) && distanceEntre(point, lieu) <= lieu.rayon_m,
  );
}
