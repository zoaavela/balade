import { couleurs } from '@/theme';

export type CategorieId = 'culture' | 'lieux-de-vie' | 'mysteres-nature' | 'quartiers' | 'legendaire';

export type Categorie = {
  nom: string;
  bordure: string; // cadre coloré de la carte
  lisere: string; // trait autour de l'illustration et du panneau du dos
  tranche: string; // épaisseur du carton, assombrie couche après couche
  tampon: string; // encre du tampon « Validé »
  surBordure: string; // texte posé directement sur la couleur de bordure (dos uni)
};

export const categories: Record<CategorieId, Categorie> = {
  culture: {
    nom: 'Monuments et culture',
    bordure: couleurs.brique,
    lisere: couleurs.encre,
    tranche: couleurs.brique,
    tampon: couleurs.brique,
    surBordure: couleurs.fond,
  },
  'lieux-de-vie': {
    nom: 'Lieux de vie',
    bordure: couleurs.cobalt,
    lisere: couleurs.encre,
    tranche: couleurs.cobalt,
    tampon: couleurs.cobalt,
    surBordure: couleurs.fond,
  },
  'mysteres-nature': {
    nom: 'Mystères et nature',
    bordure: couleurs.vertBouteille,
    lisere: couleurs.encre,
    tranche: couleurs.vertBouteille,
    tampon: couleurs.vertBouteille,
    surBordure: couleurs.fond,
  },
  quartiers: {
    nom: 'Quartiers',
    bordure: couleurs.ocre,
    lisere: couleurs.encre,
    tranche: couleurs.ocre,
    tampon: couleurs.ocre,
    surBordure: couleurs.encre, // le crème se lit mal sur l'ocre
  },
  // Or sur encre : cadre noir, liseré et tranche dorés.
  legendaire: {
    nom: 'Légendaire',
    bordure: couleurs.encre,
    lisere: couleurs.or,
    tranche: couleurs.or,
    tampon: couleurs.encre,
    surBordure: couleurs.or,
  },
};
