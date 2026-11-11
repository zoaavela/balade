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

// Mélange deux couleurs hexadécimales. t = 0 donne a, t = 1 donne b.
// Sert à fabriquer des teintes voisines (tranche des cartes) sans inventer de nouvelles couleurs.
export function melanger(a: string, b: string, t: number): string {
  const lire = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [lire(a), lire(b)];
  return (
    '#' +
    ca
      .map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0'))
      .join('')
  );
}

export const espace = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;
