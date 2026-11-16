// Recalage des positions sur les rues (T19).
//
// Chaque point enregistré est rattaché au segment de rue le plus proche, à
// moins de 25 m, en favorisant la rue où l'on était déjà pour ne pas sauter
// sur une rue parallèle. Un point sans rue proche n'est jamais affiché.
//
// Une rue ne compte comme parcourue que si l'on avance vraiment le long d'elle :
// au moins deux points recalés de suite, avec 10 m de progression sur la rue,
// ou le passage vers une rue reliée.
//
// En plus, rien n'est validé tant qu'on ne se déplace pas pour de vrai : sur
// les 8 derniers points, il faut s'être éloigné d'au moins 50 m, et que cet
// éloignement fasse au moins 60 % du chemin suivi. Une marche avance, même en
// tournant à un coin ; la dérive du GPS chez soi tourne sur place.
// Les rues rencontrées pendant ces 8 points sont mises de côté : validées si le
// mouvement se confirme, oubliées sinon.

import type { SQLiteDatabase } from 'expo-sqlite';

import { distanceEntre } from '@/balade/mesures';

import { baseCompte } from '@/db/base';
import {
  ecrireEtat, enregistrerPassage, lireEtat, marquerRecale, pointsARecaler, purgerPointsBruts,
  type PointARecaler,
} from '@/db/rues';
import { annoncerPassages } from '@/suivi/evenements';
import { PAUSE_MAX } from '@/trajets/decouper';

import {
  chargerReseau, idSegment, longueurSegment, projeter, relies, segmentDepuisId, segmentsProches,
  versMetres, voisins, type Reseau,
} from './reseau';

const RAYON_M = 25;
const BONUS_MEME_RUE_M = 8; // rester sur la même rue compte comme 8 m de moins
const BONUS_RUE_RELIEE_M = 4; // passer sur une rue reliée, 4 m de moins
const PROGRESSION_MIN_M = 10;
const COMBLEMENT_MAX_M = 60; // petits segments sautés entre deux points, comblés jusqu'à cette longueur
const PAQUET = 500;
const FENETRE = 8; // points regardés pour savoir si l'on se déplace
const ELOIGNEMENT_MIN_M = 50;
const RECTITUDE_MIN = 0.6;
const SEGMENT_COURT_M = 25; // assez court pour ne recevoir qu'un seul point en marchant

const CLE_COURSE = 'recalage_course';
const CLE_FENETRE = 'recalage_fenetre';
const CLE_ATTENTE = 'recalage_attente';

type PointFenetre = { latitude: number; longitude: number; horodatage: number };

// Un passage mis de côté en attendant de savoir si l'on se déplace vraiment.
type PassageEnAttente = { segment_id: string; horodatage: number; vu: number };

function lireJson<T>(base: SQLiteDatabase, cle: string, defaut: T): T {
  try {
    const texte = lireEtat(base, cle);
    return texte ? (JSON.parse(texte) as T) : defaut;
  } catch {
    return defaut;
  }
}

function enMouvement(fenetre: PointFenetre[]): boolean {
  if (fenetre.length < FENETRE) return false;
  let chemin = 0;
  for (let i = 1; i < fenetre.length; i++) chemin += distanceEntre(fenetre[i - 1], fenetre[i]);
  const eloignement = distanceEntre(fenetre[0], fenetre[fenetre.length - 1]);
  return eloignement >= ELOIGNEMENT_MIN_M && eloignement >= RECTITUDE_MIN * chemin;
}

// Le segment où l'on avance en ce moment.
type Course = {
  segment: number;
  abscisseDebut: number;
  horodatageDebut: number;
  dernier: number; // horodatage du dernier point sur ce segment
  nbPoints: number;
  valide: boolean; // passage déjà enregistré
};

type CourseEnregistree = Omit<Course, 'segment'> & { segment_id: string };

function lireCourse(base: SQLiteDatabase, r: Reseau): Course | null {
  const texte = lireEtat(base, CLE_COURSE);
  if (!texte) return null;
  try {
    const c = JSON.parse(texte) as CourseEnregistree;
    const segment = segmentDepuisId(r, c.segment_id);
    return segment === null ? null : { ...c, nbPoints: c.nbPoints ?? 1, segment };
  } catch {
    return null;
  }
}

function ecrireCourse(base: SQLiteDatabase, r: Reseau, c: Course | null) {
  if (!c) return ecrireEtat(base, CLE_COURSE, null);
  const { segment, ...reste } = c;
  const enregistree: CourseEnregistree = { ...reste, segment_id: idSegment(r, segment) };
  ecrireEtat(base, CLE_COURSE, JSON.stringify(enregistree));
}

// Traite un point. Renvoie la nouvelle course et le nombre de passages validés.
function traiterPoint(
  base: SQLiteDatabase,
  r: Reseau,
  course: Course | null,
  p: PointARecaler,
  bouge: boolean,
  attente: PassageEnAttente[],
): { course: Course | null; valides: number } {
  const t = p.horodatage;
  const enCours = course && t - course.dernier <= PAUSE_MAX ? course : null;

  const candidats = segmentsProches(r, p.latitude, p.longitude, RAYON_M);
  if (candidats.length === 0) return { course: null, valides: 0 }; // hors des rues

  let meilleur = candidats[0];
  let meilleurScore = Infinity;
  for (const c of candidats) {
    let score = c.distance_m;
    if (enCours) {
      if (c.segment === enCours.segment) score -= BONUS_MEME_RUE_M;
      else if (relies(r, c.segment, enCours.segment)) score -= BONUS_RUE_RELIEE_M;
    }
    if (score < meilleurScore) {
      meilleurScore = score;
      meilleur = c;
    }
  }
  const s = meilleur.segment;
  const [x, y] = versMetres(r, p.latitude, p.longitude);
  const abscisse = projeter(r, s, x, y).abscisse_m;

  let valides = 0;
  // Sans vrai déplacement, on suit la course mais le passage est mis de côté.
  const valider = (segment: number, quand: number) => {
    const id = idSegment(r, segment);
    if (!bouge) {
      if (!attente.some((a) => a.segment_id === id && a.horodatage === quand)) {
        attente.push({ segment_id: id, horodatage: quand, vu: t });
      }
      return false;
    }
    enregistrerPassage(base, id, quand);
    valides++;
    return true;
  };
  // La rue qu'on quitte : validée si on y a eu deux points, ou si elle est trop courte pour ça.
  const validerCourseQuittee = (c: Course) => {
    if (c.valide) return;
    if (c.nbPoints >= 2 || longueurSegment(r, c.segment) <= SEGMENT_COURT_M) valider(c.segment, c.horodatageDebut);
  };
  const nouvelle = (): Course => ({
    segment: s, abscisseDebut: abscisse, horodatageDebut: t, dernier: t, nbPoints: 1, valide: false,
  });

  if (!enCours) return { course: nouvelle(), valides };

  // Toujours sur la même rue : on valide dès qu'on a avancé de 10 m.
  if (s === enCours.segment) {
    const suite = { ...enCours, dernier: t, nbPoints: enCours.nbPoints + 1 };
    if (!suite.valide && Math.abs(abscisse - enCours.abscisseDebut) >= PROGRESSION_MIN_M) {
      suite.valide = valider(s, enCours.horodatageDebut);
    }
    return { course: suite, valides };
  }

  // Passage vers une rue reliée : la rue d'avant est parcourue.
  if (relies(r, enCours.segment, s)) {
    validerCourseQuittee(enCours);
    return { course: nouvelle(), valides };
  }

  // Des petits segments sautés entre les deux points (carrefour compliqué,
  // bouts de rue courts) : on comble par le plus court chemin.
  const entre = cheminCourt(r, enCours.segment, s, COMBLEMENT_MAX_M);
  if (entre) {
    validerCourseQuittee(enCours);
    for (const segment of entre) valider(segment, t);
  }
  // Sinon, saut vers une rue sans lien (rue parallèle, trou dans le signal) : on repart de zéro.
  return { course: nouvelle(), valides };
}

// Plus court chemin de rues entre deux segments, sans les compter. Renvoie les
// segments du milieu, ou null s'il faut plus de `budget` mètres pour les relier.
function cheminCourt(r: Reseau, depart: number, arrivee: number, budget: number): number[] | null {
  const cout = new Map<number, number>([[depart, 0]]);
  const venuDe = new Map<number, number>();
  const aVoir: number[] = [depart];
  while (aVoir.length) {
    // Peu de segments en jeu : une simple recherche du moins coûteux suffit.
    let k = 0;
    for (let i = 1; i < aVoir.length; i++) if (cout.get(aVoir[i])! < cout.get(aVoir[k])!) k = i;
    const s = aVoir.splice(k, 1)[0];
    for (const v of voisins(r, s)) {
      if (v === arrivee) {
        const chemin: number[] = [];
        for (let x = s; x !== depart; x = venuDe.get(x)!) chemin.unshift(x);
        return chemin;
      }
      const c = cout.get(s)! + longueurSegment(r, v);
      if (c > budget || c >= (cout.get(v) ?? Infinity)) continue;
      cout.set(v, c);
      venuDe.set(v, s);
      aVoir.push(v);
    }
  }
  return null;
}

let enCours: Promise<void> | null = null;
let relancer = false;

// Recale tous les points pas encore traités, y compris les anciens au premier
// lancement après la mise à jour, puis purge les points bruts trop vieux.
// Un seul recalage à la fois : un appel pendant qu'il tourne le relance à la fin.
export function recalerEnAttente(): Promise<void> {
  if (enCours) {
    relancer = true;
    return enCours;
  }
  enCours = (async () => {
    try {
      do {
        relancer = false;
        await recaler();
      } while (relancer);
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}

async function recaler() {
  const r = await chargerReseau();
  let base: SQLiteDatabase;
  try {
    base = baseCompte(); // fixée pour tout ce recalage
  } catch {
    return; // personne n'est connecté
  }

  for (;;) {
    const points = pointsARecaler(base, PAQUET);
    if (points.length === 0) break;
    let valides = 0;
    base.withTransactionSync(() => {
      let course = lireCourse(base, r);
      let fenetre = lireJson<PointFenetre[]>(base, CLE_FENETRE, []);
      let attente = lireJson<PassageEnAttente[]>(base, CLE_ATTENTE, []);
      for (const p of points) {
        // Après une longue pause, le mouvement se juge à nouveau depuis zéro.
        const dernier = fenetre[fenetre.length - 1];
        if (dernier && p.horodatage - dernier.horodatage > PAUSE_MAX) fenetre = [];
        fenetre = [...fenetre, { latitude: p.latitude, longitude: p.longitude, horodatage: p.horodatage }].slice(-FENETRE);
        // Les passages mis de côté plus vieux que la fenêtre sont oubliés.
        attente = attente.filter((a) => a.vu >= fenetre[0].horodatage);
        const bouge = enMouvement(fenetre);
        if (bouge) {
          // Le mouvement se confirme : les rues des derniers points sont validées.
          for (const a of attente) enregistrerPassage(base, a.segment_id, a.horodatage);
          valides += attente.length;
          attente = [];
        }
        const res = traiterPoint(base, r, course, p, bouge, attente);
        course = res.course;
        valides += res.valides;
        marquerRecale(base, p.id);
      }
      ecrireCourse(base, r, course);
      ecrireEtat(base, CLE_FENETRE, JSON.stringify(fenetre));
      ecrireEtat(base, CLE_ATTENTE, JSON.stringify(attente));
    });
    if (valides > 0) annoncerPassages();
    if (points.length < PAQUET) break;
    // Laisse respirer l'interface entre deux paquets d'anciens points.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  purgerPointsBruts(base);
}
