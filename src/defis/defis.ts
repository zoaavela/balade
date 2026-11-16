// Une icône à la fois : importer l'index chargerait les 6 000 icônes de Tabler.
import type { Icon } from '@tabler/icons-react-native';
import IconBallFootball from '@tabler/icons-react-native/IconBallFootball';
import IconBook from '@tabler/icons-react-native/IconBook';
import IconBuildingArch from '@tabler/icons-react-native/IconBuildingArch';
import IconBuildingBank from '@tabler/icons-react-native/IconBuildingBank';
import IconBuildingBridge from '@tabler/icons-react-native/IconBuildingBridge';
import IconBuildingCastle from '@tabler/icons-react-native/IconBuildingCastle';
import IconBuildingChurch from '@tabler/icons-react-native/IconBuildingChurch';
import IconFlag from '@tabler/icons-react-native/IconFlag';
import IconGrave2 from '@tabler/icons-react-native/IconGrave2';
import IconShoppingBag from '@tabler/icons-react-native/IconShoppingBag';
import IconTrain from '@tabler/icons-react-native/IconTrain';
import IconTrees from '@tabler/icons-react-native/IconTrees';
import IconWindmill from '@tabler/icons-react-native/IconWindmill';

import { lieux, type Lieu } from '@/cartes/lieux';
import { couleurs } from '@/theme';

// Les 13 défis de docs/LIEUX.md (T27). Un défi est terminé quand tous ses lieux sont
// débloqués : tout se déduit des cartes, rien de plus n'est enregistré ni synchronisé.
// Les défis basés sur les rues (Monopoly, bestiaire...) viendront plus tard.

export type Defi = {
  id: string;
  titre: string;
  contenu: string;
  lieux: string[]; // à débloquer
  revele: string[]; // secrets qui deviennent des indices quand le défi est terminé
  timbreSpecial: boolean;
  couleur: string;
  icone: Icon;
};

const D = (
  id: string, titre: string, contenu: string, couleur: string, icone: Icon,
  lieuxDuDefi: string[], revele: string[] = [], timbreSpecial = false,
): Defi => ({ id, titre, contenu, lieux: lieuxDuDefi, revele, timbreSpecial, couleur, icone });

export const defis: Defi[] = [
  D('train', 'Voyage en train', 'Les sept grandes gares parisiennes.', couleurs.cobalt, IconTrain,
    ['gare-du-nord', 'gare-de-l-est', 'gare-de-lyon', 'gare-d-austerlitz', 'gare-de-bercy', 'gare-montparnasse', 'gare-saint-lazare'],
    ['ancienne-gare-d-ornano', 'rue-cremieux']),
  D('ponts', 'Les ponts de Paris', 'Cinq ponts et passerelles.', couleurs.brique, IconBuildingBridge,
    ['pont-neuf', 'pont-alexandre-iii', 'pont-des-arts', 'pont-de-bir-hakeim', 'passerelle-simone-de-beauvoir'],
    ['ile-aux-cygnes', 'square-du-vert-galant']),
  D('passages', 'Passages couverts', 'Les trois grands passages des Grands Boulevards.', couleurs.brique, IconBuildingArch,
    ['passage-des-panoramas', 'galerie-vivienne', 'passage-jouffroy'], [], true),
  D('pouvoir', 'Sortie politique', 'Les lieux du pouvoir.', couleurs.brique, IconBuildingBank,
    ['hotel-de-ville', 'jardin-du-luxembourg', 'palais-royal', 'assemblee-nationale', 'palais-de-l-elysee'],
    ['metre-etalon']),
  D('revolution', 'Révolution', 'Les lieux de 1789 et après.', couleurs.brique, IconFlag,
    ['pantheon', 'place-de-la-concorde', 'conciergerie', 'place-de-la-bastille'], [], true),
  D('rive-gauche', 'Rive gauche', 'Écrivains, cafés et Quartier latin.', couleurs.ocre, IconBook,
    ['quartier-latin', 'saint-germain-des-pres', 'sorbonne', 'shakespeare-and-company', 'cafe-de-flore', 'les-deux-magots'],
    ['rue-du-chat-qui-peche']),
  D('paris-ancien', 'Paris romain et médiéval', 'Les plus vieilles pierres de la ville.', couleurs.brique, IconBuildingChurch,
    ['notre-dame', 'sainte-chapelle', 'musee-de-cluny', 'tour-saint-jacques'],
    ['arenes-de-lutece']),
  D('montmartre', 'Montmartre', 'La butte de haut en bas.', couleurs.ocre, IconWindmill,
    ['sacre-coeur', 'montmartre', 'moulin-rouge', 'place-du-tertre', 'cafe-des-deux-moulins', 'cimetiere-de-montmartre'],
    ['villa-leandre', 'mur-des-je-t-aime']),
  D('parcs', 'Les grands parcs', 'Cinq parcs et jardins de Paris.', couleurs.vertBouteille, IconTrees,
    ['jardin-du-luxembourg', 'jardin-des-tuileries', 'buttes-chaumont', 'parc-de-la-villette', 'parc-monceau'],
    ['butte-bergeyre']),
  D('cimetieres', 'Cimetières célèbres', 'Les trois grands cimetières.', couleurs.vertBouteille, IconGrave2,
    ['pere-lachaise', 'cimetiere-du-montparnasse', 'cimetiere-de-montmartre'], [], true),
  D('stades', 'Les stades', 'Foot, tennis, rugby et concerts.', couleurs.cobalt, IconBallFootball,
    ['parc-des-princes', 'roland-garros', 'stade-de-france', 'accor-arena'], [], true),
  D('westfield', 'Westfield', 'Les centres Westfield de la petite couronne.', couleurs.cobalt, IconShoppingBag,
    ['forum-des-halles', 'les-4-temps', 'westfield-rosny-2'], [], true),
  // Récompense : mène vers Versailles, Fontainebleau et Vaux-le-Vicomte, légendaires
  // déjà visibles sur la carte. Rien à révéler, seulement un texte.
  D('chateaux', 'Les châteaux', 'Trois châteaux proches de Paris.', couleurs.brique, IconBuildingCastle,
    ['chateau-de-vincennes', 'parc-de-sceaux', 'chateau-de-malmaison']),
];

export const defiParId = new Map(defis.map((d) => [d.id, d]));
const lieuParId = new Map(lieux.map((l) => [l.id, l]));

export function lieuxDuDefi(d: Defi): Lieu[] {
  return d.lieux.map((id) => lieuParId.get(id)!);
}

export function avancement(d: Defi, debloquees: { has(id: string): boolean }): number {
  return d.lieux.filter((id) => debloquees.has(id)).length;
}

export function estTermine(d: Defi, debloquees: { has(id: string): boolean }): boolean {
  return d.lieux.every((id) => debloquees.has(id));
}

// Date de fin : celle du dernier lieu débloqué du défi.
export function termineLe(d: Defi, debloquees: Map<string, Date>): Date | null {
  if (!estTermine(d, debloquees)) return null;
  return new Date(Math.max(...d.lieux.map((id) => debloquees.get(id)!.getTime())));
}

// Les secrets révélés par les défis terminés.
export function secretsRevelesPar(debloquees: { has(id: string): boolean }): Set<string> {
  const res = new Set<string>();
  for (const d of defis) if (estTermine(d, debloquees)) d.revele.forEach((id) => res.add(id));
  return res;
}

// Ce que rapporte un défi, en une ligne.
export function recompense(d: Defi): string {
  if (d.revele.length === 1) return 'Révèle un lieu secret';
  if (d.revele.length > 1) return `Révèle ${d.revele.length} lieux secrets`;
  if (d.timbreSpecial) return 'Timbre spécial';
  return 'Mène vers trois châteaux légendaires';
}

// Contrôle au chargement : chaque identifiant doit exister, sinon c'est une faute de frappe.
if (__DEV__) {
  for (const d of defis) {
    for (const id of [...d.lieux, ...d.revele]) {
      if (!lieuParId.has(id)) console.warn(`Défi ${d.id} : lieu inconnu ${id}`);
    }
  }
}
