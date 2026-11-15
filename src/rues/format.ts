// Format des fichiers produits par scripts/rues/generer.mjs.
// Les deux fichiers doivent rester d'accord.
//
// rues.bin, petit-boutiste, sections alignées sur 4 octets :
//   entête      Uint32[16]  magique, version, nbSegments, nbPoints, colonnes,
//                           lignes, nbIndex, tailleCase_m
//   bornes      Float64[4]  sud, ouest, nord, est
//   debutPts    Uint32[nbSegments + 1]
//   pts         Uint16[nbPoints * 2]  x, y quantifiés de 0 à 65535 dans les bornes
//   voie        Uint32[nbSegments]    identifiant de la voie OpenStreetMap
//   partie      Uint16[nbSegments]    numéro du morceau dans la voie
//   nom         Uint16[nbSegments]    ligne dans rues-noms.txt, 65535 sans nom
//   type        Uint8[nbSegments]     index dans TYPES_VOIE
//   zone        Uint8[nbSegments]     ligne dans zones.txt, 255 hors zone
//   debutCase   Uint32[colonnes * lignes + 1]
//   contenu     Uint32[nbIndex]       segments de chaque case de la grille
//
// fond.bin :
//   entête       Uint32[8]   magique, version, nbPolygones, nbAnneaux, nbPoints
//   debutAnneaux Uint32[nbPolygones + 1]
//   debutPts     Uint32[nbAnneaux + 1]
//   pts          Uint16[nbPoints * 2]
//   ref          Uint16[nbPolygones]  ligne dans zones.txt pour une zone
//   genre        Uint8[nbPolygones]   index dans GENRES_FOND

export const MAGIQUE_RUES = 0x53455552;
export const MAGIQUE_FOND = 0x444e4f46;
export const VERSION = 1;
export const QUANT = 65535;
export const SANS_NOM = 0xffff;
export const HORS_ZONE = 255;

export const TYPES_VOIE = [
  'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'living_street', 'pedestrian', 'footway', 'path', 'steps', 'cycleway',
] as const;
export type TypeVoie = (typeof TYPES_VOIE)[number];

export const GENRES_FOND = ['eau', 'parc', 'zone'] as const;
export type GenreFond = (typeof GENRES_FOND)[number];
