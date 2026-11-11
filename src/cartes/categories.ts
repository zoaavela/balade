import { couleurs } from '@/theme';

export type CategorieId = 'culture' | 'lieux-de-vie' | 'mysteres-nature' | 'quartiers' | 'legendaire';

export type Categorie = {
  nom: string;
  bordure: string; // cadre coloré de la carte
  lisere: string; // trait autour de l'illustration et du panneau du dos
  tranche: string; // épaisseur du carton, assombrie couche après couche
  tampon: string; // encre du tampon « Validé »
};

export const categories: Record<CategorieId, Categorie> = {
  culture: {
    nom: 'Monuments et culture',
    bordure: couleurs.brique,
    lisere: couleurs.encre,
    tranche: couleurs.brique,
    tampon: couleurs.brique,
  },
  'lieux-de-vie': {
    nom: 'Lieux de vie',
    bordure: couleurs.cobalt,
    lisere: couleurs.encre,
    tranche: couleurs.cobalt,
    tampon: couleurs.cobalt,
  },
  'mysteres-nature': {
    nom: 'Mystères et nature',
    bordure: couleurs.vertBouteille,
    lisere: couleurs.encre,
    tranche: couleurs.vertBouteille,
    tampon: couleurs.vertBouteille,
  },
  quartiers: {
    nom: 'Quartiers',
    bordure: couleurs.ocre,
    lisere: couleurs.encre,
    tranche: couleurs.ocre,
    tampon: couleurs.ocre,
  },
  // Or sur encre : cadre noir, liseré et tranche dorés.
  legendaire: {
    nom: 'Légendaire',
    bordure: couleurs.encre,
    lisere: couleurs.or,
    tranche: couleurs.or,
    tampon: couleurs.encre,
  },
};
