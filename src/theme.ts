// Seul endroit où sont définies les couleurs, la police et les tailles de base.
// Un écran ne doit jamais écrire un code couleur en dur : il pioche ici.

export const couleurs = {
  fond: '#F2EADA', // crème
  encre: '#211D1A', // contours et texte
  ocre: '#DDA43B', // rues et marche
  cobalt: '#3F62C2', // transports
  brique: '#C65A3E', // culture
  vertBouteille: '#4F8A62', // mystères
  or: '#D6AE4E', // légendaire, toujours posé sur l'encre
  encreDouce: 'rgba(33, 29, 26, 0.45)', // texte secondaire, onglets inactifs
} as const;

export const polices = {
  normal: 'BricolageGrotesque_400Regular',
  moyen: 'BricolageGrotesque_500Medium',
  gras: 'BricolageGrotesque_700Bold',
  extraGras: 'BricolageGrotesque_800ExtraBold',
} as const;

export const trait = 2.5; // épaisseur des contours

export const espace = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;
