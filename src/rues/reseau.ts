// Réseau des rues embarqué dans l'app (ticket T18).
//
// Les fichiers de assets/data/ sont générés par scripts/rues/generer.mjs.
// Ils sont lus comme des fichiers (expo-asset puis expo-file-system), jamais
// inclus dans le code : le chargement ne fige pas l'écran.

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import {
  GENRES_FOND, HORS_ZONE, MAGIQUE_FOND, MAGIQUE_RUES, QUANT, SANS_NOM, TYPES_VOIE, VERSION,
  type GenreFond, type TypeVoie,
} from './format';

export type Zone = { type: 'arrondissement' | 'commune'; nom: string };

export type Reseau = {
  nbSegments: number;
  bornes: { sud: number; ouest: number; nord: number; est: number };
  largeur_m: number;
  hauteur_m: number;
  debutPts: Uint32Array;
  pts: Uint16Array;
  voie: Uint32Array;
  partie: Uint16Array;
  nom: Uint16Array;
  type: Uint8Array;
  zone: Uint8Array;
  colonnes: number;
  lignes: number;
  tailleCase_m: number;
  debutCase: Uint32Array;
  contenu: Uint32Array;
  noms: string[];
  zones: Zone[];
  fond: Fond;
  chargeEn_ms: number;
};

export type Fond = {
  nbPolygones: number;
  debutAnneaux: Uint32Array;
  debutPts: Uint32Array;
  pts: Uint16Array;
  ref: Uint16Array;
  genre: Uint8Array;
};

export type SegmentProche = { segment: number; distance_m: number };

let enCours: Promise<Reseau> | null = null;

// Charge le réseau une seule fois. Les appels suivants renvoient le même.
export function chargerReseau(): Promise<Reseau> {
  if (!enCours) {
    enCours = charger().catch((err) => {
      enCours = null; // nouvel essai au prochain appel
      throw err;
    });
  }
  return enCours;
}

async function lireAsset(module: number): Promise<File> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Fichier introuvable : ${asset.name}`);
  return new File(asset.localUri);
}

// Un ArrayBuffer qui commence à l'octet 0, pour créer des vues alignées.
async function octets(fichier: File): Promise<ArrayBuffer> {
  const b = await fichier.bytes();
  return b.byteOffset === 0 && b.byteLength === b.buffer.byteLength ? b.buffer : b.slice().buffer;
}

async function charger(): Promise<Reseau> {
  const debut = Date.now();
  const [fRues, fFond, fNoms, fZones] = await Promise.all([
    lireAsset(require('../../assets/data/rues.bin')),
    lireAsset(require('../../assets/data/fond.bin')),
    lireAsset(require('../../assets/data/rues-noms.txt')),
    lireAsset(require('../../assets/data/zones.txt')),
  ]);
  const [bRues, bFond, tNoms, tZones] = await Promise.all([
    octets(fRues), octets(fFond), fNoms.text(), fZones.text(),
  ]);

  const r = lireRues(bRues);
  const fond = lireFond(bFond);
  const noms = tNoms.split('\n');
  const zones = tZones.split('\n').filter(Boolean).map((ligne) => {
    const [type, nom] = ligne.split('\t');
    return { type: type as Zone['type'], nom };
  });

  return { ...r, noms, zones, fond, chargeEn_ms: Date.now() - debut };
}

// Lit les sections les unes après les autres, alignées sur 4 octets.
function lecteur(buffer: ArrayBuffer) {
  let pos = 0;
  const avancer = (octets: number) => {
    const debut = pos;
    pos += octets;
    pos += (4 - (pos % 4)) % 4;
    return debut;
  };
  return {
    u32: (n: number) => new Uint32Array(buffer, avancer(n * 4), n),
    u16: (n: number) => new Uint16Array(buffer, avancer(n * 2), n),
    u8: (n: number) => new Uint8Array(buffer, avancer(n), n),
    f64: (n: number) => new Float64Array(buffer, avancer(n * 8), n),
  };
}

function lireRues(buffer: ArrayBuffer) {
  const l = lecteur(buffer);
  const e = l.u32(16);
  if (e[0] !== MAGIQUE_RUES || e[1] !== VERSION) throw new Error('rues.bin : format inattendu');
  const [, , nbSegments, nbPts, colonnes, lignes, nbIndex, tailleCase_m] = e;
  const [sud, ouest, nord, est] = l.f64(4);
  const mParDegLon = M_PAR_DEG_LAT * Math.cos((((sud + nord) / 2) * Math.PI) / 180);
  return {
    nbSegments,
    bornes: { sud, ouest, nord, est },
    largeur_m: (est - ouest) * mParDegLon,
    hauteur_m: (nord - sud) * M_PAR_DEG_LAT,
    debutPts: l.u32(nbSegments + 1),
    pts: l.u16(nbPts * 2),
    voie: l.u32(nbSegments),
    partie: l.u16(nbSegments),
    nom: l.u16(nbSegments),
    type: l.u8(nbSegments),
    zone: l.u8(nbSegments),
    colonnes,
    lignes,
    tailleCase_m,
    debutCase: l.u32(colonnes * lignes + 1),
    contenu: l.u32(nbIndex),
  };
}

function lireFond(buffer: ArrayBuffer): Fond {
  const l = lecteur(buffer);
  const e = l.u32(8);
  if (e[0] !== MAGIQUE_FOND || e[1] !== VERSION) throw new Error('fond.bin : format inattendu');
  const [, , nbPolygones, nbAnneaux, nbPts] = e;
  return {
    nbPolygones,
    debutAnneaux: l.u32(nbPolygones + 1),
    debutPts: l.u32(nbAnneaux + 1),
    pts: l.u16(nbPts * 2),
    ref: l.u16(nbPolygones),
    genre: l.u8(nbPolygones),
  };
}

const M_PAR_DEG_LAT = 111_320;

// Position GPS vers mètres depuis le coin sud-ouest de la zone.
export function versMetres(r: Reseau, lat: number, lon: number): [number, number] {
  const { sud, ouest, nord, est } = r.bornes;
  return [((lon - ouest) / (est - ouest)) * r.largeur_m, ((lat - sud) / (nord - sud)) * r.hauteur_m];
}

// Point k du tableau pts, en mètres.
function pointM(r: Reseau, k: number): [number, number] {
  return [(r.pts[k * 2] / QUANT) * r.largeur_m, (r.pts[k * 2 + 1] / QUANT) * r.hauteur_m];
}

function distanceAuSegment(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}

// Distance en mètres entre un point (en mètres) et un segment de rue.
export function distanceAuTrace(r: Reseau, segment: number, px: number, py: number): number {
  let min = Infinity;
  const fin = r.debutPts[segment + 1];
  let prec = pointM(r, r.debutPts[segment]);
  for (let k = r.debutPts[segment] + 1; k < fin; k++) {
    const cur = pointM(r, k);
    const d = distanceAuSegment(px, py, prec, cur);
    if (d < min) min = d;
    prec = cur;
  }
  return min;
}

// Segments à moins de `rayon_m` d'une position, du plus proche au plus loin.
export function segmentsProches(r: Reseau, lat: number, lon: number, rayon_m = 25): SegmentProche[] {
  const [x, y] = versMetres(r, lat, lon);
  if (x < -rayon_m || y < -rayon_m || x > r.largeur_m + rayon_m || y > r.hauteur_m + rayon_m) return [];

  const c0 = Math.max(0, Math.floor((x - rayon_m) / r.tailleCase_m));
  const c1 = Math.min(r.colonnes - 1, Math.floor((x + rayon_m) / r.tailleCase_m));
  const l0 = Math.max(0, Math.floor((y - rayon_m) / r.tailleCase_m));
  const l1 = Math.min(r.lignes - 1, Math.floor((y + rayon_m) / r.tailleCase_m));

  const vus = new Set<number>();
  const resultat: SegmentProche[] = [];
  for (let l = l0; l <= l1; l++) {
    for (let c = c0; c <= c1; c++) {
      const i = l * r.colonnes + c;
      for (let k = r.debutCase[i]; k < r.debutCase[i + 1]; k++) {
        const s = r.contenu[k];
        if (vus.has(s)) continue;
        vus.add(s);
        const d = distanceAuTrace(r, s, x, y);
        if (d <= rayon_m) resultat.push({ segment: s, distance_m: d });
      }
    }
  }
  return resultat.sort((a, b) => a.distance_m - b.distance_m);
}

// Identifiant stable d'un segment : voie OpenStreetMap et numéro du morceau.
export function idSegment(r: Reseau, segment: number): string {
  return `${r.voie[segment]}-${r.partie[segment]}`;
}

export function nomSegment(r: Reseau, segment: number): string | null {
  const n = r.nom[segment];
  return n === SANS_NOM ? null : (r.noms[n] ?? null);
}

export function typeSegment(r: Reseau, segment: number): TypeVoie {
  return TYPES_VOIE[r.type[segment]];
}

export function zoneSegment(r: Reseau, segment: number): Zone | null {
  const z = r.zone[segment];
  return z === HORS_ZONE ? null : (r.zones[z] ?? null);
}

export function genreFond(f: Fond, polygone: number): GenreFond {
  return GENRES_FOND[f.genre[polygone]];
}
