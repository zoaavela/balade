import type { CategorieId } from '@/cartes/categories';
import { lieux, type Lieu } from '@/cartes/lieux';
import { defis, type Defi } from '@/defis/defis';

// Le carnet de timbres (T25) : une page par défi, plus une page « Autres lieux ».
// Tout se déduit des lieux et des défis : rien n'est enregistré.

export type Page = {
  id: string; // id du défi, ou « autres »
  titre: string;
  defi?: Defi;
  lieux: Lieu[]; // les emplacements de la page, dans l'ordre du défi
  reveles: Lieu[]; // secrets révélés par le défi, en bas de page, hors du compte
};

export const ID_AUTRES = 'autres';

const lieuParId = new Map(lieux.map((l) => [l.id, l]));
const dansUnDefi = new Set(defis.flatMap((d) => [...d.lieux, ...d.revele]));

const toutesLesPages: Page[] = [
  ...defis.map((d) => ({
    id: d.id,
    titre: d.titre,
    defi: d,
    lieux: d.lieux.map((id) => lieuParId.get(id)!),
    reveles: d.revele.map((id) => lieuParId.get(id)!),
  })),
  {
    id: ID_AUTRES,
    titre: 'Autres lieux',
    lieux: lieux.filter((l) => !dansUnDefi.has(l.id)),
    reveles: [],
  },
];

// Avec un filtre, chaque page ne garde que les timbres de la catégorie,
// et une page qui n'en a plus aucun disparaît.
export function pagesDuCarnet(filtre: CategorieId | null): Page[] {
  if (!filtre) return toutesLesPages;
  return toutesLesPages
    .map((p) => ({
      ...p,
      lieux: p.lieux.filter((l) => l.categorie === filtre),
      reveles: p.reveles.filter((l) => l.categorie === filtre),
    }))
    .filter((p) => p.lieux.length + p.reveles.length > 0);
}

// Une page est complète quand tous ses lieux sont trouvés, filtre ou pas.
export function pageComplete(id: string, debloquees: { has(id: string): boolean }): boolean {
  const page = toutesLesPages.find((p) => p.id === id);
  return !!page && page.lieux.every((l) => debloquees.has(l.id));
}
