import type { CategorieId } from './categories';

export type Lieu = {
  id: string; // minuscules et tirets, sert aussi de nom au fichier d'illustration
  nom: string;
  categorie: CategorieId;
  adresse: string;
  anecdote: string; // une ou deux phrases
};

// Le numéro d'une carte est sa position dans cette liste.
// Ajouter les nouveaux lieux à la fin pour ne pas renuméroter les anciens.
export const lieux: Lieu[] = [
  {
    id: 'tour-eiffel',
    nom: 'Tour Eiffel',
    categorie: 'culture',
    adresse: 'Champ de Mars, 75007 Paris',
    anecdote:
      "Construite pour l'Exposition universelle de 1889, elle devait être démontée au bout de vingt ans. La radio l'a sauvée.",
  },
  {
    id: 'arc-de-triomphe',
    nom: 'Arc de Triomphe',
    categorie: 'culture',
    adresse: 'Place Charles-de-Gaulle, 75008 Paris',
    anecdote:
      "Napoléon le commande en 1806 après Austerlitz. Il ne sera terminé qu'en 1836, longtemps après sa chute.",
  },
];

export function numeroDe(lieu: Lieu): number {
  return lieux.findIndex((l) => l.id === lieu.id) + 1;
}
