// Petits outils de dates, toujours à l'heure locale du téléphone.

export function debutDuJour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function jourSuivant(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export function memeJour(a: Date, b: Date): boolean {
  return debutDuJour(a).getTime() === debutDuJour(b).getTime();
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

// « Aujourd'hui », « Hier », sinon « lundi 9 novembre ».
export function nommerJour(d: Date): string {
  const maintenant = new Date();
  if (memeJour(d, maintenant)) return "Aujourd'hui";
  const hier = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1);
  if (memeJour(d, hier)) return 'Hier';
  const annee = d.getFullYear() === maintenant.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}${annee}`;
}
