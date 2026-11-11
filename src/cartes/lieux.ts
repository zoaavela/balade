import type { CategorieId } from './categories';

export type Lieu = {
  id: string; // minuscules et tirets, sert aussi de nom au fichier d'illustration
  nom: string;
  categorie: CategorieId;
  latitude: number;
  longitude: number;
  rayon_m: number; // entrer dans ce cercle débloque la carte
  adresse: string;
  anecdote: string; // une ou deux phrases, un fait vérifiable. Vide plutôt qu'inventé.
};

// Le numéro d'une carte est sa position dans cette liste (001 à 020).
// Ajouter les nouveaux lieux à la fin pour ne pas renuméroter les anciens.
// Coordonnées vérifiées sur OpenStreetMap le 11 novembre 2026.
export const lieux: Lieu[] = [
  {
    id: 'tour-eiffel',
    nom: 'Tour Eiffel',
    categorie: 'culture',
    latitude: 48.8583,
    longitude: 2.2945,
    rayon_m: 120,
    adresse: 'Champ de Mars, 5 avenue Anatole-France, 75007 Paris',
    anecdote:
      "Construite pour l'Exposition universelle de 1889, elle devait être démontée au bout de vingt ans. Ses antennes de radio l'ont sauvée.",
  },
  {
    id: 'arc-de-triomphe',
    nom: 'Arc de Triomphe',
    categorie: 'culture',
    latitude: 48.8738,
    longitude: 2.295,
    rayon_m: 100,
    adresse: 'Place Charles-de-Gaulle, 75008 Paris',
    anecdote:
      "Napoléon le commande en 1806 après Austerlitz. Il ne sera inauguré qu'en 1836, sous Louis-Philippe.",
  },
  {
    id: 'louvre',
    nom: 'Louvre',
    categorie: 'culture',
    latitude: 48.861, // la Pyramide, au centre du palais
    longitude: 2.3358,
    rayon_m: 200,
    adresse: 'Rue de Rivoli, 75001 Paris',
    anecdote:
      "Avant d'être un musée, c'était un château fort bâti vers 1190 par Philippe Auguste. Ses fondations se visitent encore sous la cour Carrée.",
  },
  {
    id: 'notre-dame',
    nom: 'Notre-Dame',
    categorie: 'culture',
    latitude: 48.8529,
    longitude: 2.3501,
    rayon_m: 120,
    adresse: '6 parvis Notre-Dame, 75004 Paris',
    anecdote:
      'Le point zéro des routes de France est scellé sur son parvis. Les distances routières depuis Paris se comptent à partir de lui.',
  },
  {
    id: 'sacre-coeur',
    nom: 'Sacré-Cœur',
    categorie: 'culture',
    latitude: 48.8868,
    longitude: 2.343,
    rayon_m: 100,
    adresse: '35 rue du Chevalier-de-la-Barre, 75018 Paris',
    anecdote:
      "Sa pierre vient de Château-Landon, en Seine-et-Marne. Au contact de la pluie, elle libère du calcaire qui la garde blanche.",
  },
  {
    id: 'pantheon',
    nom: 'Panthéon',
    categorie: 'culture',
    latitude: 48.8462,
    longitude: 2.3461,
    rayon_m: 100,
    adresse: 'Place du Panthéon, 75005 Paris',
    anecdote:
      'En 1851, Léon Foucault suspend un pendule de 67 mètres sous la coupole pour montrer que la Terre tourne.',
  },
  {
    id: 'chateau-de-vincennes',
    nom: 'Château de Vincennes',
    categorie: 'culture',
    latitude: 48.8429,
    longitude: 2.4358,
    rayon_m: 200,
    adresse: 'Avenue de Paris, 94300 Vincennes',
    anecdote:
      "Son donjon, haut d'une cinquantaine de mètres, est le plus haut donjon médiéval d'Europe.",
  },
  {
    id: 'gare-du-nord',
    nom: 'Gare du Nord',
    categorie: 'lieux-de-vie',
    latitude: 48.8809, // la façade principale, place Napoléon-III
    longitude: 2.3553,
    rayon_m: 150,
    adresse: '18 rue de Dunkerque, 75010 Paris',
    anecdote:
      "C'est la gare la plus fréquentée d'Europe, avec environ 700 000 voyageurs par jour.",
  },
  {
    id: 'gare-de-lyon',
    nom: 'Gare de Lyon',
    categorie: 'lieux-de-vie',
    latitude: 48.8447,
    longitude: 2.3738,
    rayon_m: 150,
    adresse: 'Place Louis-Armand, 75012 Paris',
    anecdote:
      "Son restaurant, Le Train Bleu, a été construit pour l'Exposition universelle de 1900. Son décor est classé monument historique.",
  },
  {
    id: 'parc-des-princes',
    nom: 'Parc des Princes',
    categorie: 'lieux-de-vie',
    latitude: 48.8414,
    longitude: 2.2531,
    rayon_m: 150,
    adresse: '24 rue du Commandant-Guilbaud, 75016 Paris',
    anecdote:
      "Le stade actuel date de 1972. Avant lui, un vélodrome au même endroit a accueilli l'arrivée du Tour de France de 1903 à 1967.",
  },
  {
    id: 'forum-des-halles',
    nom: 'Westfield Forum des Halles',
    categorie: 'lieux-de-vie',
    latitude: 48.8622,
    longitude: 2.3461,
    rayon_m: 150,
    adresse: '101 porte Berger, 75001 Paris',
    anecdote:
      "Pendant plus de huit siècles, c'était le grand marché alimentaire de Paris. Il est parti à Rungis en 1969.",
  },
  {
    id: 'les-4-temps',
    nom: 'Westfield Les 4 Temps',
    categorie: 'lieux-de-vie',
    latitude: 48.8906,
    longitude: 2.2377,
    rayon_m: 150,
    adresse: '15 parvis de La Défense, 92800 Puteaux',
    anecdote: '',
  },
  {
    id: 'jardin-du-luxembourg',
    nom: 'Jardin du Luxembourg',
    categorie: 'mysteres-nature',
    latitude: 48.8467,
    longitude: 2.3364,
    rayon_m: 300,
    adresse: 'Rue de Médicis, 75006 Paris',
    anecdote:
      'Il a été créé en 1612 pour Marie de Médicis, avec son palais. Le Sénat siège aujourd’hui dans ce palais.',
  },
  {
    id: 'buttes-chaumont',
    nom: 'Buttes-Chaumont',
    categorie: 'mysteres-nature',
    latitude: 48.8796,
    longitude: 2.3821,
    rayon_m: 300,
    adresse: '1 rue Botzaris, 75019 Paris',
    anecdote:
      "Avant le parc, il y avait une carrière de gypse et une décharge. Il a ouvert en 1867, pour l'Exposition universelle.",
  },
  {
    id: 'bois-de-boulogne',
    nom: 'Bois de Boulogne',
    categorie: 'mysteres-nature',
    latitude: 48.8641,
    longitude: 2.2483,
    rayon_m: 1500,
    adresse: '75016 Paris',
    anecdote:
      "C'est un reste de l'ancienne forêt de Rouvray. L'État l'a cédé à la Ville de Paris en 1852, qui en a fait une promenade.",
  },
  {
    id: 'ile-aux-cygnes',
    nom: 'Île aux Cygnes',
    categorie: 'mysteres-nature',
    latitude: 48.8531,
    longitude: 2.2841,
    rayon_m: 300,
    adresse: 'Pont de Bir-Hakeim, 75015 Paris',
    anecdote:
      "Cette île artificielle date de 1827. À sa pointe se dresse une réplique de la statue de la Liberté, offerte par les Américains de Paris en 1889.",
  },
  {
    id: 'la-defense',
    nom: 'La Défense',
    categorie: 'quartiers',
    latitude: 48.8918,
    longitude: 2.238,
    rayon_m: 600,
    adresse: 'Parvis de La Défense, 92800 Puteaux',
    anecdote:
      'Le quartier doit son nom à une statue, La Défense de Paris, qui rend hommage aux soldats de la guerre de 1870.',
  },
  {
    id: 'le-marais',
    nom: 'Le Marais',
    categorie: 'quartiers',
    latitude: 48.8604,
    longitude: 2.3607,
    rayon_m: 600,
    adresse: 'Paris 3e et 4e',
    anecdote:
      'Son nom dit vrai : c’étaient des terres marécageuses, asséchées et cultivées au Moyen Âge.',
  },
  {
    id: 'montmartre',
    nom: 'Montmartre',
    categorie: 'quartiers',
    latitude: 48.8865, // place du Tertre, en haut de la butte
    longitude: 2.3405,
    rayon_m: 500,
    adresse: 'Place du Tertre, 75018 Paris',
    anecdote:
      "Montmartre n'est rattaché à Paris que depuis 1860. Avant, c'était une commune à part, avec ses vignes et ses moulins.",
  },
  {
    id: 'belleville',
    nom: 'Belleville',
    categorie: 'quartiers',
    latitude: 48.872, // carrefour du métro Belleville
    longitude: 2.377,
    rayon_m: 500,
    adresse: 'Paris 19e et 20e',
    anecdote:
      "Belleville était une commune indépendante jusqu'en 1860. Ses guinguettes attiraient les Parisiens, car le vin y était moins taxé qu'en ville.",
  },
];

export function numeroDe(lieu: Lieu): number {
  return lieux.findIndex((l) => l.id === lieu.id) + 1;
}
