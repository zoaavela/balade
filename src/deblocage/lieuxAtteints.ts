import { distanceEntre, type Point } from '@/balade/mesures';
import { lieuxPlaces, type Emplacement, type LieuPlace } from '@/cartes/lieux';

// Les lieux pas encore débloqués qui contiennent ce point.
export function lieuxAtteints(point: Point, dejaDebloques: Set<string>): LieuPlace[] {
  return lieuxPlaces.filter((lieu) => !dejaDebloques.has(lieu.id) && dansLieu(point, lieu.emplacement));
}

const METRES_PAR_DEGRE = 111_195;

// Dans le cercle d'abord, tri rapide. Puis, si OSM a le contour, dans la zone ou
// le long de la ligne, à la marge près.
export function dansLieu(point: Point, e: Emplacement): boolean {
  if (distanceEntre(point, e) > e.rayon_m) return false;
  const c = e.contour;
  if (!c) return true;

  // Coordonnées en mètres autour du point : à l'échelle d'un lieu, la Terre est plate.
  const kx = METRES_PAR_DEGRE * Math.cos((point.latitude * Math.PI) / 180);
  const x = (lon: number) => (lon - point.longitude) * kx;
  const y = (lat: number) => (lat - point.latitude) * METRES_PAR_DEGRE;

  for (const t of c.traces) {
    let dedans = false;
    const n = t.length / 2;
    for (let i = 0; i < n; i++) {
      const ax = x(t[2 * i + 1]), ay = y(t[2 * i]);
      if (i + 1 < n || c.genre === 'zone') {
        const j = (i + 1) % n;
        const bx = x(t[2 * j + 1]), by = y(t[2 * j]);
        if (distanceAOrigine(ax, ay, bx, by) <= c.marge_m) return true;
        // Rayon vers la droite depuis le point : on compte les bords traversés.
        if (c.genre === 'zone' && ay > 0 !== by > 0 && 0 < ax + ((bx - ax) * -ay) / (by - ay)) {
          dedans = !dedans;
        }
      } else if (Math.hypot(ax, ay) <= c.marge_m) {
        return true; // ligne d'un seul point
      }
    }
    if (dedans) return true;
  }
  return false;
}

// Distance du point (0, 0) au segment AB.
function distanceAOrigine(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, (-ax * dx - ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
