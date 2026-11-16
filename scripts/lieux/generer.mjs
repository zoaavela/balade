// Positions, rayons et contours des lieux, calculés depuis OpenStreetMap (T23).
//
// Lancement : node scripts/lieux/generer.mjs
// Source : l'extrait Île-de-France déjà en cache pour les rues
// (scripts/rues/cache/ile-de-france.osm.pbf, voir scripts/rues/generer.mjs).
// Sortie : src/cartes/positions.json, relu par src/cartes/lieux.ts.
//
// Chaque lieu est cherché par son nom dans OSM. La position « vers » n'est qu'un
// repère pour départager les homonymes (il y a beaucoup d'« Hôtel de Ville ») :
// un élément trouvé à plus de `rayonRecherche` mètres de ce repère est refusé.
// Un lieu introuvable est listé à la fin, sans position inventée.
//
// Trois façons de débloquer :
// - point : l'emprise du bâtiment plus 40 m, ou un cercle si OSM n'a qu'un point ;
// - zone : le contour réel (parcs, bois, quartiers, cimetières), avec une marge ;
// - ligne : le long d'une voie ou d'un canal, avec une marge.

import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lirePbf } from '../rues/pbf.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const PBF = join(ICI, '..', 'rues', 'cache', 'ile-de-france.osm.pbf');
const SORTIE = join(ICI, '..', '..', 'src', 'cartes', 'positions.json');

const RAYON_MIN_M = 50; // en dessous, la précision du GPS en ville ne suffit plus
const MARGE_BATIMENT_M = 40;
const MARGE_ZONE_M = 15;
const MARGE_LIGNE_M = 25;
const SIMPLIFICATION_M = 8;

// mode : point (défaut), zone ou ligne. noms : par ordre de préférence.
// filtre : étiquettes exigées en plus du nom, pour les noms trop courants.
const L = (id, noms, vers, options = {}) => ({ id, noms, vers, ...options });
const zone = { mode: 'zone' };
const ligne = (marge = MARGE_LIGNE_M) => ({ mode: 'ligne', marge });
const loin = { rayonRecherche: 3000 };

const LIEUX = [
  L('tour-eiffel', ['Tour Eiffel'], [48.8583, 2.2945]),
  L('arc-de-triomphe', ["Arc de Triomphe de l'Étoile", 'Arc de Triomphe'], [48.8738, 2.295], { marge: 80 }), // au milieu d'une place immense
  L('louvre', ['Musée du Louvre', 'Palais du Louvre', 'Louvre'], [48.861, 2.3358]),
  L('notre-dame', ['Cathédrale Notre-Dame de Paris', 'Notre-Dame de Paris'], [48.853, 2.3499], { marge: 80 }), // avec le parvis
  L('sacre-coeur', ['Basilique du Sacré-Cœur de Montmartre', 'Basilique du Sacré-Cœur', 'Sacré-Cœur'], [48.8867, 2.3431]),
  L('pantheon', ['Panthéon'], [48.8462, 2.3461]),
  L('chateau-de-vincennes', ['Château de Vincennes'], [48.8429, 2.4359]),
  L('invalides', ['Hôtel des Invalides', 'Les Invalides'], [48.855, 2.3125]),
  L('sainte-chapelle', ['Sainte-Chapelle'], [48.8554, 2.345]),
  L('opera-garnier', ['Palais Garnier', 'Opéra Garnier'], [48.872, 2.3316]),
  L('centre-pompidou', ['Centre Georges Pompidou', 'Centre Pompidou',"Centre national d'art et de culture Georges-Pompidou"], [48.8607, 2.3522]),
  L('grand-palais', ['Grand Palais'], [48.8662, 2.3125]),
  L('musee-d-orsay', ["Musée d'Orsay"], [48.86, 2.3266]),
  L('place-de-la-concorde', ['Place de la Concorde'], [48.8656, 2.3212]),
  L('hotel-de-ville', ['Hôtel de Ville', 'Hôtel de Ville de Paris'], [48.8566, 2.3522], { rayonRecherche: 300 }),
  L('trocadero', ['Palais de Chaillot', 'Jardins du Trocadéro', 'Trocadéro'], [48.8622, 2.2876]),
  L('place-des-vosges', ['Place des Vosges'], [48.8556, 2.3655], { rayon: 90 }), // seul un point dans OSM, la place fait 140 m
  L('basilique-saint-denis', ['Basilique-cathédrale de Saint-Denis', 'Basilique cathédrale de Saint-Denis', 'Basilique Saint-Denis', 'Cathédrale Saint-Denis'], [48.9356, 2.3597]),
  L('pont-neuf', ['Pont Neuf'], [48.8571, 2.3413]),
  L('pont-alexandre-iii', ['Pont Alexandre III'], [48.8639, 2.3136]),
  L('pere-lachaise', ['Cimetière du Père-Lachaise', 'Cimetière du Père Lachaise'], [48.861, 2.3933], zone),
  L('gare-du-nord', ['Paris Gare du Nord', 'Gare du Nord', 'Paris-Nord'], [48.8809, 2.3553]),
  L('gare-de-l-est', ["Paris Gare de l'Est", "Gare de l'Est", 'Paris-Est'], [48.8768, 2.3592]),
  L('gare-de-lyon', ['Paris Gare de Lyon', 'Gare de Lyon'], [48.8443, 2.3744]),
  L('gare-d-austerlitz', ['Paris Austerlitz', "Gare d'Austerlitz"], [48.842, 2.3655]),
  L('gare-de-bercy', ["Gare de Paris-Bercy-Bourgogne-Pays d'Auvergne", "Paris Bercy Bourgogne - Pays d'Auvergne",'Paris Bercy', 'Paris-Bercy', 'Gare de Bercy'], [48.8392, 2.3826]),
  L('gare-montparnasse', ['Paris Montparnasse', 'Gare Montparnasse'], [48.8412, 2.3205]),
  L('gare-saint-lazare', ['Paris Saint-Lazare', 'Gare Saint-Lazare'], [48.8763, 2.3254]),
  L('parc-des-princes', ['Parc des Princes'], [48.8414, 2.253]),
  L('roland-garros', ['Stade Roland-Garros', 'Stade Roland Garros'], [48.846, 2.249]),
  L('stade-de-france', ['Stade de France'], [48.9245, 2.3601]),
  L('accor-arena', ['Accor Arena', 'Palais omnisports de Paris-Bercy'], [48.8386, 2.3786]),
  L('forum-des-halles', ['Westfield Forum des Halles', 'Forum des Halles'], [48.8624, 2.3466]),
  L('les-4-temps', ['Westfield Les 4 Temps', 'Les 4 Temps', 'Les Quatre Temps'], [48.8908, 2.239]),
  L('jardin-du-luxembourg', ['Jardin du Luxembourg'], [48.8462, 2.3372], zone),
  L('jardin-des-tuileries', ['Jardin des Tuileries'], [48.8635, 2.3275], zone),
  L('buttes-chaumont', ['Parc des Buttes-Chaumont', 'Parc des Buttes Chaumont'], [48.8809, 2.3828], zone),
  L('parc-de-la-villette', ['Parc de la Villette'], [48.8938, 2.39], zone),
  L('bois-de-boulogne', ['Bois de Boulogne'], [48.8624, 2.2492], { ...zone, ...loin }),
  L('bois-de-vincennes', ['Bois de Vincennes'], [48.832, 2.433], { ...zone, ...loin }),
  L('canal-saint-martin', ['Canal Saint-Martin'], [48.871, 2.365], { ...ligne(30), filtre: { waterway: 'canal' }, ...loin }),
  L('la-defense', ['Place de la Défense'], [48.892, 2.238], { rayon: 600 }), // pas de contour du quartier dans OSM : l'esplanade et un grand cercle
  L('le-marais', ['Le Marais', 'Marais'], [48.859, 2.359], { ...zone, ...loin }),
  L('montmartre', ['Montmartre'], [48.8865, 2.34], { ...zone, ...loin }),
  L('belleville', ['Belleville'], [48.872, 2.385], { ...zone, ...loin }),
  L('quartier-latin', ['Quartier de la Sorbonne', 'Quartier latin'], [48.849, 2.345], { ...zone, ...loin, rayon: 450 }), // pas de contour « Quartier latin » : le quartier administratif de la Sorbonne, son cœur
  L('saint-germain-des-pres', ['Quartier de Saint-Germain-des-Prés', 'Saint-Germain-des-Prés'], [48.854, 2.3335], { ...zone, ...loin, rayon: 400 }),
  L('champs-elysees', ['Avenue des Champs-Élysées'], [48.8698, 2.3076], { ...ligne(30), filtre: { highway: null } }),
  L('jardin-des-plantes', ['Jardin des Plantes'], [48.844, 2.359], zone),
  L('grande-mosquee', ['Grande Mosquée de Paris'], [48.842, 2.355]),
  L('musee-de-cluny', ['Musée de Cluny', 'Musée de Cluny - Musée national du Moyen Âge', 'Musée national du Moyen Âge'], [48.8505, 2.344]),
  L('tour-saint-jacques', ['Tour Saint-Jacques'], [48.858, 2.3489]),
  L('conciergerie', ['Conciergerie'], [48.856, 2.3456]),
  L('place-de-la-bastille', ['Place de la Bastille'], [48.8532, 2.3691]),
  L('palais-royal', ['Jardin du Palais-Royal', 'Jardin du Palais Royal', 'Palais-Royal', 'Palais Royal'], [48.8648, 2.3375]),
  L('assemblee-nationale', ['Palais Bourbon', 'Assemblée nationale'], [48.8619, 2.3185]),
  L('palais-de-l-elysee', ["Palais de l'Élysée"], [48.8704, 2.3167]),
  L('sorbonne', ['Université Paris 1 Panthéon-Sorbonne - Centre Sorbonne', 'Sorbonne', 'La Sorbonne'], [48.8487, 2.343]),
  L('shakespeare-and-company', ['Shakespeare and Company'], [48.8526, 2.3471]),
  L('cafe-de-flore', ['Café de Flore'], [48.8541, 2.3326]),
  L('les-deux-magots', ['Les Deux Magots', 'Aux Deux Magots'], [48.854, 2.3333]),
  L('passage-des-panoramas', ['Passage des Panoramas'], [48.8712, 2.3418]),
  L('galerie-vivienne', ['Galerie Vivienne'], [48.8664, 2.3398]),
  L('passage-jouffroy', ['Passage Jouffroy'], [48.873, 2.3423]),
  L('marche-des-enfants-rouges', ['Marché couvert des Enfants Rouges', 'Marché des Enfants Rouges', 'Marché des Enfants-Rouges'], [48.8628, 2.3619]),
  L('pont-des-arts', ['Pont des Arts'], [48.8583, 2.3375]),
  L('pont-de-bir-hakeim', ['Pont de Bir-Hakeim'], [48.8556, 2.2876]),
  L('passerelle-simone-de-beauvoir', ['Passerelle Simone-de-Beauvoir', 'Passerelle Simone de Beauvoir'], [48.8357, 2.378]),
  L('grand-rex', ['Le Grand Rex', 'Grand Rex'], [48.8707, 2.3478]),
  L('moulin-rouge', ['Moulin Rouge'], [48.8841, 2.3322]),
  L('place-du-tertre', ['Place du Tertre'], [48.8865, 2.3408]),
  L('cafe-des-deux-moulins', ['Café des Deux Moulins', 'Les Deux Moulins'], [48.8848, 2.3337]),
  L('parc-monceau', ['Parc Monceau'], [48.8796, 2.3088], zone),
  L('cimetiere-du-montparnasse', ['Cimetière du Montparnasse'], [48.8382, 2.327], zone),
  L('cimetiere-de-montmartre', ['Cimetière de Montmartre'], [48.8875, 2.33], zone),
  L('catacombes', ['Catacombes de Paris', 'Les Catacombes de Paris'], [48.8338, 2.3324]),
  L('puces-de-saint-ouen', ['Marché aux Puces de Saint-Ouen', 'Marché aux puces de Saint-Ouen', 'Puces de Saint-Ouen'], [48.901, 2.343], loin),
  L('parc-de-sceaux', ['Parc de Sceaux', 'Domaine de Sceaux', 'Domaine départemental de Sceaux'], [48.773, 2.299], { ...zone, ...loin }),
  L('domaine-de-saint-cloud', ['Domaine national de Saint-Cloud', 'Parc de Saint-Cloud'], [48.837, 2.214], { ...zone, ...loin }),
  L('chateau-de-malmaison', ['Château de Malmaison', 'Château de la Malmaison'], [48.8705, 2.1675]),
  L('parc-de-la-poudrerie', ['Parc forestier de la Poudrerie', 'Parc de la Poudrerie'], [48.935, 2.54], { ...zone, ...loin }),
  L('westfield-rosny-2', ['Westfield Rosny 2', 'Rosny 2'], [48.881, 2.48]),
  L('metre-etalon', ['Mètre étalon', 'Mètre-étalon'], [48.8494, 2.3329]),
  L('point-zero', ['Point zéro des routes de France', 'Point zéro'], [48.8534, 2.3488]),
  L('rue-du-chat-qui-peche', ['Rue du Chat-qui-Pêche', 'Rue du Chat qui Pêche'], [48.853, 2.3448], ligne(15)),
  L('arenes-de-lutece', ['Arènes de Lutèce'], [48.8453, 2.3527]),
  L('ile-aux-cygnes', ['Île aux Cygnes'], [48.851, 2.281], { ...zone, ...loin }),
  L('ancienne-gare-d-ornano', ['Boulevard Ornano', 'Ornano', 'Gare du Boulevard Ornano'], [48.8975, 2.347], { filtre: { railway: null, 'disused:railway': null, building: null, historic: null } }),
  L('rue-cremieux', ['Rue Crémieux'], [48.8463, 2.372], ligne(15)),
  L('butte-bergeyre', ['Butte Bergeyre', 'Jardin de la Butte Bergeyre'], [48.8772, 2.377], { rayon: 150 }), // le jardin en haut de la butte
  L('villa-leandre', ['Villa Léandre'], [48.8879, 2.3364], ligne(15)),
  L('mur-des-je-t-aime', ["Le Mur des je t'aime", "Mur des je t'aime", "Le mur des je t'aime"], [48.8848, 2.3387]),
  L('square-du-vert-galant', ['Square du Vert-Galant', 'Square du Vert Galant'], [48.8575, 2.3398], zone),
  L('chateau-de-versailles', ['Château de Versailles'], [48.8049, 2.1204], loin),
  L('chateau-de-fontainebleau', ['Château de Fontainebleau'], [48.4021, 2.6997], loin),
  L('vaux-le-vicomte', ['Château de Vaux-le-Vicomte', 'Vaux-le-Vicomte'], [48.5655, 2.714], loin),
  L('provins', ['Tour César'], [48.561, 3.29], { ...loin, rayon: 450 }), // la ville haute autour de la tour
  L('desert-de-retz', ['Désert de Retz'], [48.891, 2.018], { ...zone, ...loin, rayon: 250 }),
  L('auvers-sur-oise', ['Auvers-sur-Oise'], [49.07, 2.17], { ...zone, rayonRecherche: 5000, filtre: { boundary: 'administrative' } }),
  L('station-fantome', ['Croix-Rouge'], [48.8522, 2.3279], { filtre: { railway: null, 'disused:railway': null, 'abandoned:railway': null } }),
];

// --- Noms -------------------------------------------------------------------

// Un nom secondaire compte un demi-rang de moins que le nom principal.
const CLES_NOM = ['name', 'name:fr', 'official_name', 'alt_name', 'short_name'];
const SECONDAIRE = { official_name: 0.5, alt_name: 0.5, short_name: 0.5 };

function normaliser(t) {
  return t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

// nom normalisé -> [{ lieu, rang }]
const parNom = new Map();
for (const l of LIEUX) {
  l.noms.forEach((nom, rang) => {
    const n = normaliser(nom);
    if (!parNom.has(n)) parNom.set(n, []);
    parNom.get(n).push({ lieu: l, rang });
  });
}

// Éléments sans intérêt même s'ils portent le bon nom : arrêts, quais, itinéraires.
function bruit(tags) {
  return (
    tags.highway === 'bus_stop' ||
    ['platform', 'stop_position', 'stop_area', 'stop_area_group'].includes(tags.public_transport) ||
    ['platform', 'stop', 'subway_entrance', 'tram_stop', 'halt'].includes(tags.railway) ||
    tags.amenity === 'parking' || tags.amenity === 'bicycle_rental' || tags.amenity === 'taxi' ||
    ['route', 'route_master', 'public_transport', 'site', 'associatedStreet', 'street', 'restriction'].includes(tags.type)
  );
}

// Mode enquête : node scripts/lieux/generer.mjs --chercher=ornano,bergeyre
// affiche tout ce dont le nom contient ces mots, sans rien écrire.
const RECHERCHES = (process.argv.find((a) => a.startsWith('--chercher=')) ?? '')
  .slice('--chercher='.length).split(',').filter(Boolean).map(normaliser);
const PSEUDO = RECHERCHES.map((mot) => ({ id: `? ${mot}`, noms: [], vers: [48.86, 2.35], mot }));

function correspond(tags) {
  if (RECHERCHES.length) {
    const noms = CLES_NOM.map((k) => tags[k]).filter(Boolean).map(normaliser);
    return PSEUDO.filter((p) => noms.some((n) => n.includes(p.mot))).map((lieu) => ({ lieu, rang: 0 }));
  }
  if (bruit(tags)) return [];
  const res = [];
  for (const cle of CLES_NOM) {
    const v = tags[cle];
    if (!v) continue;
    for (const morceau of v.split(';')) {
      for (const c of parNom.get(normaliser(morceau)) ?? []) {
        if (c.lieu.filtre && !passeFiltre(tags, c.lieu.filtre)) continue;
        const rang = c.rang + (SECONDAIRE[cle] ?? 0);
        const deja = res.findIndex((r) => r.lieu === c.lieu);
        if (deja < 0) res.push({ ...c, rang });
        else if (res[deja].rang > rang) res[deja] = { ...c, rang };
      }
    }
  }
  return res;
}

// filtre : { cle: valeur } exige cette valeur, { cle: null } exige seulement la clé.
// Il suffit qu'une des clés soit satisfaite.
function passeFiltre(tags, filtre) {
  return Object.entries(filtre).some(([k, v]) => (v === null ? k in tags : tags[k] === v));
}

// --- Géométrie --------------------------------------------------------------

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

function metres(lat0) {
  const kx = R * rad(1) * Math.cos(rad(lat0));
  const ky = R * rad(1);
  return {
    vers: ([lat, lon]) => [lon * kx, lat * ky],
    depuis: ([x, y]) => [y / ky, x / kx],
  };
}

function distance(a, b) {
  const m = metres((a[0] + b[0]) / 2);
  const [x1, y1] = m.vers(a), [x2, y2] = m.vers(b);
  return Math.hypot(x2 - x1, y2 - y1);
}

function aireEtCentre(anneau) {
  const m = metres(anneau[0][0]);
  const p = anneau.map(m.vers);
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const f = p[j][0] * p[i][1] - p[i][0] * p[j][1];
    a += f; cx += (p[j][0] + p[i][0]) * f; cy += (p[j][1] + p[i][1]) * f;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) return { aire: 0, centre: moyenne(anneau) };
  return { aire: Math.abs(a), centre: m.depuis([cx / (6 * a), cy / (6 * a)]) };
}

function moyenne(pts) {
  let la = 0, lo = 0;
  for (const [a, b] of pts) { la += a; lo += b; }
  return [la / pts.length, lo / pts.length];
}

function longueur(trace) {
  let s = 0;
  for (let i = 1; i < trace.length; i++) s += distance(trace[i - 1], trace[i]);
  return s;
}

// Point au milieu d'une ligne, en suivant la ligne.
function milieu(trace) {
  const total = longueur(trace);
  let s = 0;
  for (let i = 1; i < trace.length; i++) {
    const d = distance(trace[i - 1], trace[i]);
    if (s + d >= total / 2) {
      const t = d ? (total / 2 - s) / d : 0;
      return [trace[i - 1][0] + t * (trace[i][0] - trace[i - 1][0]), trace[i - 1][1] + t * (trace[i][1] - trace[i - 1][1])];
    }
    s += d;
  }
  return trace[0];
}

function simplifier(trace, tol) {
  if (trace.length < 3) return trace;
  const m = metres(trace[0][0]);
  const p = trace.map(m.vers);
  const garder = new Uint8Array(p.length);
  garder[0] = garder[p.length - 1] = 1;
  const pile = [[0, p.length - 1]];
  while (pile.length) {
    const [a, b] = pile.pop();
    let max = 0, k = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanceAuSegment(p[i], p[a], p[b]);
      if (d > max) { max = d; k = i; }
    }
    if (k >= 0 && max > tol) { garder[k] = 1; pile.push([a, k], [k, b]); }
  }
  return trace.filter((_, i) => garder[i]);
}

function distanceAuSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Recolle des morceaux de voies en anneaux fermés (contours de relations).
function anneaux(morceaux) {
  const restants = morceaux.filter((m) => m.length >= 2).map((m) => [...m]);
  const res = [];
  const meme = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (restants.length) {
    let anneau = restants.shift();
    let progres = true;
    while (!meme(anneau[0], anneau[anneau.length - 1]) && progres) {
      progres = false;
      for (let i = 0; i < restants.length; i++) {
        const m = restants[i], fin = anneau[anneau.length - 1];
        if (meme(m[0], fin)) anneau = anneau.concat(m.slice(1));
        else if (meme(m[m.length - 1], fin)) anneau = anneau.concat([...m].reverse().slice(1));
        else continue;
        restants.splice(i, 1);
        progres = true;
        break;
      }
    }
    if (meme(anneau[0], anneau[anneau.length - 1]) && anneau.length >= 4) res.push(anneau);
  }
  return res;
}

// --- Lecture de l'extrait ---------------------------------------------------

if (!existsSync(PBF)) {
  console.error(`Extrait introuvable : ${PBF}\nLancer d'abord node scripts/rues/generer.mjs, qui le télécharge.`);
  process.exit(1);
}

const candidats = []; // { lieu, rang, type, id, tags, ... }
const relations = new Map(); // id -> membres
const voiesVoulues = new Set();
const voies = new Map(); // id -> refs
const noeudsVoulus = new Set();
const positions = new Map(); // id noeud -> [lat, lon]

console.log('Passage 1 sur 3 : relations');
lirePbf(PBF, {
  relations(id, tags, membres) {
    if (tags.type !== 'multipolygon' && tags.type !== 'boundary') return;
    const c = correspond(tags);
    if (!c.length) return;
    relations.set(id, membres);
    for (const m of membres) if (m.type === 'way' && m.role !== 'inner') voiesVoulues.add(m.ref);
    for (const x of c) candidats.push({ ...x, type: 'relation', id, tags });
  },
});

console.log('Passage 2 sur 3 : voies');
lirePbf(PBF, {
  voies(id, tags, refs) {
    const c = correspond(tags);
    if (!c.length && !voiesVoulues.has(id)) return;
    voies.set(id, refs);
    for (const r of refs) noeudsVoulus.add(r);
    for (const x of c) candidats.push({ ...x, type: 'way', id, tags });
  },
});

console.log('Passage 3 sur 3 : noeuds');
lirePbf(PBF, {
  noeuds(id, lat, lon, tags) {
    if (noeudsVoulus.has(id)) positions.set(id, [lat, lon]);
    const c = tags && tags.name ? correspond(tags) : [];
    for (const x of c) candidats.push({ ...x, type: 'node', id, tags, point: [lat, lon] });
  },
});

// --- Géométrie de chaque candidat --------------------------------------------

function geometrieVoie(id) {
  const refs = voies.get(id);
  if (!refs) return null;
  const pts = refs.map((r) => positions.get(r));
  return pts.every(Boolean) ? pts : null;
}

for (const c of candidats) {
  if (c.type === 'node') {
    c.centre = c.point;
    c.aire = 0;
    continue;
  }
  if (c.type === 'way') {
    const g = geometrieVoie(c.id);
    if (!g) continue;
    const ferme = g.length >= 4 && g[0] === g[g.length - 1];
    if (ferme && c.lieu.mode !== 'ligne' && !c.tags.highway && !c.tags.waterway) {
      c.anneaux = [g];
      Object.assign(c, aireEtCentre(g));
    } else {
      c.lignes = [g];
      c.centre = milieu(g);
      c.aire = 0;
    }
    continue;
  }
  const membres = relations.get(c.id) ?? [];
  const morceaux = membres
    .filter((m) => m.type === 'way' && m.role !== 'inner')
    .map((m) => geometrieVoie(m.ref))
    .filter(Boolean);
  const a = anneaux(morceaux);
  if (!a.length) continue;
  c.anneaux = a;
  let aire = 0, cx = 0, cy = 0;
  for (const r of a) {
    const x = aireEtCentre(r);
    aire += x.aire; cx += x.centre[0] * x.aire; cy += x.centre[1] * x.aire;
  }
  c.aire = aire;
  c.centre = aire ? [cx / aire, cy / aire] : moyenne(a[0]);
}

if (RECHERCHES.length) {
  for (const c of candidats) {
    if (!c.centre) continue;
    const t = Object.entries(c.tags).filter(([k]) => !k.startsWith('addr:') && !k.startsWith('name:') && !k.startsWith('wiki')).map(([k, v]) => `${k}=${v}`).join(' ');
    console.log(`${c.lieu.mot.padEnd(14)} ${(c.type + '/' + c.id).padEnd(20)} ${c.centre.map((x) => x.toFixed(5)).join(', ')}  aire ${Math.round(c.aire ?? 0)}  ${t}`);
  }
  process.exit(0);
}

// --- Choix du meilleur candidat par lieu --------------------------------------

function procheDuRepere(c) {
  const rayon = c.lieu.rayonRecherche ?? 800;
  if (distance(c.centre, c.lieu.vers) <= rayon) return true;
  // Un grand contour peut avoir son centre loin du repère tout en le contenant.
  return Boolean(c.anneaux?.some((r) => dansAnneau(c.lieu.vers, r)));
}

function dansAnneau([lat, lon], r) {
  let dedans = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ai, bi] = r[i], [aj, bj] = r[j];
    if (bi > lon !== bj > lon && lat < ((aj - ai) * (lon - bi)) / (bj - bi) + ai) dedans = !dedans;
  }
  return dedans;
}

function choisir(lieu) {
  const liste = candidats.filter((c) => c.lieu === lieu && c.centre && procheDuRepere(c));
  if (!liste.length) return null;
  const mode = lieu.mode ?? 'point';
  const genre = (c) => (c.anneaux ? 'zone' : c.lignes ? 'ligne' : 'point');
  // Préférence de forme selon le mode, puis rang du nom, puis taille.
  const ordre = { zone: ['zone', 'point', 'ligne'], ligne: ['ligne', 'zone', 'point'], point: ['zone', 'point', 'ligne'] }[mode];
  // En mode point, un contour géant (emprise ferroviaire...) ne dit rien de l'entrée.
  const utilisable = (c) => !(mode === 'point' && c.anneaux && c.aire > 300000);
  // Un nom principal passe avant un nom secondaire : le musée « Conciergerie »
  // plutôt que le Palais de Justice qui l'a seulement comme autre nom.
  const secondaire = (c) => (c.rang % 1 ? 1 : 0);
  // Pour une zone, la forme d'abord : un contour vaut mieux qu'un point bien nommé.
  const parNom = (a, b) => secondaire(a) - secondaire(b);
  const parForme = (a, b) => ordre.indexOf(genre(a)) - ordre.indexOf(genre(b));
  const [premier, second] = mode === 'point' ? [parNom, parForme] : [parForme, parNom];
  const tries = liste.filter(utilisable).sort((a, b) =>
    premier(a, b) ||
    second(a, b) ||
    a.rang - b.rang ||
    (genre(a) === 'ligne' ? 0 : b.aire - a.aire) ||
    distance(a.centre, lieu.vers) - distance(b.centre, lieu.vers),
  );
  if (!tries.length) return null;
  const meilleur = tries[0];
  // Une rue ou un canal : toutes les voies du même nom, pas seulement une.
  if (genre(meilleur) === 'ligne') {
    const memes = tries.filter((c) => genre(c) === 'ligne' && c.rang === meilleur.rang && !c.tags.tunnel);
    return { ...meilleur, lignes: (memes.length ? memes : [meilleur]).flatMap((c) => c.lignes), tous: memes };
  }
  return meilleur;
}

const arrondi = (x) => Math.round(x * 1e5) / 1e5;
const aplatir = (trace) => trace.flatMap(([a, b]) => [arrondi(a), arrondi(b)]);

function adresse(tags) {
  const rue = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const ville = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  return rue && ville ? `${rue}, ${ville}` : '';
}

const sortie = {};
const introuvables = [];
const rapport = [];

for (const lieu of LIEUX) {
  const c = choisir(lieu);
  if (!c) {
    introuvables.push(lieu.id);
    continue;
  }
  const ref = `${c.type}/${c.id}`;
  const ecart = Math.round(distance(c.centre, lieu.vers));
  const entree = { latitude: arrondi(c.centre[0]), longitude: arrondi(c.centre[1]), rayon_m: 0, osm: ref };
  const adr = adresse(c.tags);
  if (adr) entree.adresse = adr;

  const mode = lieu.mode ?? 'point';
  const loinDuCentre = (traces) => Math.max(...traces.flat().map((p) => distance(c.centre, p)));
  if (c.anneaux && (mode === 'zone' || (mode === 'point' && !lieu.rayon))) {
    // Un contour : parc, quartier, ou l'emprise d'un bâtiment, avec une marge
    // plus large autour d'un bâtiment, qu'on longe sans y entrer.
    const marge = lieu.marge ?? (mode === 'zone' ? MARGE_ZONE_M : MARGE_BATIMENT_M);
    const traces = c.anneaux.map((r) => simplifier(r, SIMPLIFICATION_M));
    // Le marqueur doit tomber dans le lieu : pour une forme en L ou en deux
    // morceaux, le centre peut être dehors. On prend alors le bord le plus proche.
    if (!traces.some((r) => dansAnneau(c.centre, r))) {
      const bords = traces.flat();
      c.centre = bords.reduce((m, p) => (distance(p, c.centre) < distance(m, c.centre) ? p : m), bords[0]);
      entree.latitude = arrondi(c.centre[0]);
      entree.longitude = arrondi(c.centre[1]);
    }
    entree.rayon_m = Math.round(loinDuCentre(traces) + marge);
    entree.contour = { genre: 'zone', marge_m: marge, traces: traces.map(aplatir) };
  } else if (mode === 'ligne' && c.lignes) {
    const traces = c.lignes.map((t) => simplifier(t, SIMPLIFICATION_M / 2));
    entree.rayon_m = Math.round(loinDuCentre(traces) + lieu.marge);
    entree.contour = { genre: 'ligne', marge_m: lieu.marge, traces: traces.map(aplatir) };
  } else {
    // Un simple point dans OSM : un cercle.
    entree.rayon_m = lieu.rayon ?? RAYON_MIN_M;
  }
  sortie[lieu.id] = entree;
  const forme = entree.contour ? `${entree.contour.genre} ${entree.contour.traces.length} trace(s)` : `cercle ${entree.rayon_m} m`;
  const attendu = mode === 'point' ? '' : entree.contour ? '' : `  (voulu : ${mode})`;
  rapport.push(`${lieu.id.padEnd(30)} ${ref.padEnd(20)} ${forme.padEnd(22)} écart ${String(ecart).padStart(5)} m  « ${c.tags.name ?? ''} »${attendu}`);
}

writeFileSync(SORTIE, JSON.stringify(sortie, null, 1) + '\n');
console.log(rapport.join('\n'));
console.log(`\n${Object.keys(sortie).length} lieux placés, écrits dans ${SORTIE}`);
if (introuvables.length) console.log(`Introuvables : ${introuvables.join(', ')}`);
