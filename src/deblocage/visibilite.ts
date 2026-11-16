import { distanceEntre, type Point } from '@/balade/mesures';
import type { LieuPlace } from '@/cartes/lieux';
import { secretsRevelesPar } from '@/defis/defis';

// Ce que la carte montre d'un lieu (T26), selon sa rareté :
// - visible et légendaire : le marqueur normal ;
// - indice : une zone floue d'environ 300 m, avec un point d'interrogation et la devinette ;
// - secret : rien. Révélé par un défi terminé, il devient un indice.
// Un lieu débloqué est toujours montré avec son marqueur, quelle que soit sa rareté.

export type Affichage =
  | { genre: 'marqueur' }
  | { genre: 'indice'; centre: Point; rayon_m: number }
  | { genre: 'cache' };

const RAYON_INDICE_M = 150; // 300 m de large
const MARGE_INDICE_M = 50; // autour d'un grand lieu, la zone le dépasse un peu

// Les secrets révélés par un défi terminé (T27), d'après les cartes débloquées.
export function secretsReveles(debloquees: { has(id: string): boolean }): ReadonlySet<string> {
  return secretsRevelesPar(debloquees);
}

export function affichageLieu(
  lieu: LieuPlace,
  debloque: boolean,
  reveles: ReadonlySet<string>,
): Affichage {
  if (debloque || lieu.rarete === 'visible' || lieu.rarete === 'legendaire') return { genre: 'marqueur' };
  if (lieu.rarete === 'secret' && !reveles.has(lieu.id)) return { genre: 'cache' };
  return { genre: 'indice', ...zoneIndice(lieu) };
}

// Zone d'un indice : son centre est décalé au hasard pour ne pas tomber pile sur le
// lieu, mais toujours du même décalage pour un même lieu, d'un lancement à l'autre.
// Le décalage reste assez petit pour que le lieu soit dans la zone.
export function zoneIndice(lieu: LieuPlace): { centre: Point; rayon_m: number } {
  const e = lieu.emplacement;
  const grand = e.contour?.genre === 'zone' ? e.rayon_m : 0;
  const rayon_m = Math.max(RAYON_INDICE_M, grand + MARGE_INDICE_M);
  const h = hacher(lieu.id);
  const angle = (h % 3600) / 3600 * 2 * Math.PI;
  const decalage_m = (0.25 + (Math.floor(h / 3600) % 1000) / 1000 * 0.35) * (rayon_m - grand * 0.5);
  const centre = {
    latitude: e.latitude + (decalage_m * Math.cos(angle)) / 111_195,
    longitude: e.longitude + (decalage_m * Math.sin(angle)) / (111_195 * Math.cos((e.latitude * Math.PI) / 180)),
  };
  return { centre, rayon_m };
}

// Le lieu-indice dont la zone contient ce point, la plus petite s'il y en a plusieurs.
export function indiceTouche<T extends { lieu: LieuPlace; centre: Point; rayon_m: number }>(
  zones: T[],
  point: Point,
): T | null {
  let meilleur: T | null = null;
  for (const z of zones) {
    if (distanceEntre(point, z.centre) > z.rayon_m) continue;
    if (!meilleur || z.rayon_m < meilleur.rayon_m) meilleur = z;
  }
  return meilleur;
}

// FNV-1a : un nombre stable tiré du nom du lieu.
function hacher(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
