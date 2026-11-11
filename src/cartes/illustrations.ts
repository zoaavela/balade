// Repère automatiquement tous les fichiers .svg du dossier assets/illustrations.
// Il suffit de déposer <id>.svg dans ce dossier : aucune ligne à ajouter ici.
const fichiers = require.context('../../assets/illustrations', false, /\.svg$/);

const parId: Record<string, number> = {};
for (const chemin of fichiers.keys()) {
  const id = chemin.replace(/^.*\//, '').replace(/\.svg$/, '');
  parId[id] = fichiers(chemin);
}

// Renvoie l'illustration du lieu, ou undefined si le fichier n'existe pas encore.
export function illustrationDe(id: string): number | undefined {
  return parId[id];
}
