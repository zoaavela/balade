// Génère les données des rues embarquées dans l'app (ticket T18).
//
// Usage : node scripts/rues/generer.mjs [--source=overpass] [--rafraichir]
//
// 1. Récupère les données OpenStreetMap de la zone : voies, eau, parcs, limites
//    administratives. Deux sources possibles :
//    - par défaut, l'extrait Geofabrik de l'Île-de-France (un fichier .osm.pbf
//      d'environ 340 Mo), filtré sur notre zone ;
//    - avec --source=overpass, l'API Overpass (souvent surchargée).
//    Tout est gardé dans scripts/rues/cache/ (ignoré par Git) : relancer le
//    script ne retélécharge rien, sauf avec --rafraichir.
// 2. Filtre les voies où l'on marche, retire les doublons de rue (trottoirs,
//    passages piétons, pistes cyclables à part), coupe aux carrefours, découpe
//    au bord de la zone, simplifie.
// 3. Écrit dans assets/data/ :
//    - rues.bin       segments, coordonnées, index par grille, zone de chaque segment
//    - rues-noms.txt  un nom de rue par ligne
//    - fond.bin       eau, parcs, limites des arrondissements et communes
//    - zones.txt      une zone par ligne : « type<TAB>nom »
//
// Le format binaire est décrit dans src/rues/format.ts. Les deux fichiers
// doivent rester d'accord.

import {
  createWriteStream, mkdirSync, existsSync, readFileSync, renameSync, writeFileSync, statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';

import { lirePbf } from './pbf.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(ICI, 'cache');
const SORTIE = join(ICI, '..', '..', 'assets', 'data');
const RAFRAICHIR = process.argv.includes('--rafraichir');
const SOURCE = process.argv.includes('--source=overpass') ? 'overpass' : 'geofabrik';

// Zone couverte : la petite couronne, définie par les limites réelles des
// départements. On télécharge d'abord large, puis on garde ce qui est dedans.
const DEPARTEMENTS = ['75', '92', '93', '94'];
const LARGE = { sud: 48.66, ouest: 2.09, nord: 49.03, est: 2.66 };

// Rectangle autour des quatre départements. Calculé une fois leurs limites
// connues, il sert de repère aux coordonnées du fichier.
let SUD, OUEST, NORD, EST, M_PAR_DEG_LON, LARGEUR_M, HAUTEUR_M;
function fixerBornes(s, o, n, e) {
  SUD = s; OUEST = o; NORD = n; EST = e;
  M_PAR_DEG_LON = M_PAR_DEG_LAT * Math.cos(((SUD + NORD) / 2) * Math.PI / 180);
  LARGEUR_M = (EST - OUEST) * M_PAR_DEG_LON;
  HAUTEUR_M = (NORD - SUD) * M_PAR_DEG_LAT;
}

// Doit correspondre à TYPES_VOIE dans src/rues/format.ts.
const TYPES_VOIE = [
  'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'living_street', 'pedestrian', 'footway', 'path', 'steps', 'cycleway',
];
// Doit correspondre à GENRES_FOND dans src/rues/format.ts.
const GENRES_FOND = ['eau', 'parc', 'zone'];

const TOLERANCE_RUE_M = 1.5;   // simplification des rues
const TOLERANCE_FOND_M = 4;    // simplification de l'eau, des parcs, des limites
const CELLULE_M = 100;         // taille d'une case de la grille d'index
const QUANT = 65535;           // coordonnées stockées sur 16 bits

const M_PAR_DEG_LAT = 111_320;

// ---------------------------------------------------------------------------
// Téléchargement

// Serveur principal et miroirs, essayés à tour de rôle quand l'un est surchargé.
const SERVEURS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

async function overpass(nom, requete) {
  mkdirSync(CACHE, { recursive: true });
  const fichier = join(CACHE, `${nom}.json`);
  if (!RAFRAICHIR && existsSync(fichier)) return JSON.parse(readFileSync(fichier, 'utf8'));

  for (let essai = 1; essai <= 8; essai++) {
    const serveur = SERVEURS[(essai - 1) % SERVEURS.length];
    console.log(`  téléchargement ${nom} (essai ${essai}, ${new URL(serveur).host})`);
    const rep = await fetch(serveur, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'balade-generateur-rues' },
      body: 'data=' + encodeURIComponent(requete),
    });
    const texte = rep.ok ? await rep.text() : '';
    // Overpass peut répondre 200 avec une erreur dans « remark » : on la refuse.
    if (rep.ok && !/"remark":\s*"runtime error/.test(texte)) {
      writeFileSync(fichier, texte);
      return JSON.parse(texte);
    }
    console.log(`  réponse ${rep.status}, nouvel essai dans 15 s`);
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error(`Overpass a échoué pour ${nom}`);
}

// Requêtes de fond et de zones, partagées par les deux sources pour garder
// les mêmes règles.
function estFond(t, relation) {
  if (t.natural === 'water' || t.waterway === 'riverbank') return true;
  if (t.leisure === 'park' || t.landuse === 'forest' || t.natural === 'wood') return true;
  return !relation && t.leisure === 'garden' && t.access !== 'private';
}
const estZone = (t) => t.boundary === 'administrative' && (t.admin_level === '8' || t.admin_level === '9');
const estDepartement = (t) =>
  t.boundary === 'administrative' && t.admin_level === '6' &&
  (DEPARTEMENTS.includes(t.ref) || DEPARTEMENTS.includes(t['ref:INSEE']));
const dansLarge = (lat, lon) => lat >= LARGE.sud && lat <= LARGE.nord && lon >= LARGE.ouest && lon <= LARGE.est;
const estVoie = (t) => TYPES_VOIE.includes(t.highway);

function telecharger() {
  return SOURCE === 'overpass' ? telechargerOverpass() : extraireGeofabrik();
}

// --- Source Geofabrik -------------------------------------------------------

const URL_GEOFABRIK = 'https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf';
// Les limites des communes dépassent la zone large : on garde les noeuds
// jusqu'à cette marge autour, pour pouvoir fermer leurs contours.
const MARGE = 0.05;

async function telechargerPbf() {
  mkdirSync(CACHE, { recursive: true });
  const fichier = join(CACHE, 'ile-de-france.osm.pbf');
  if (!RAFRAICHIR && existsSync(fichier)) return fichier;
  console.log('Téléchargement de l\'extrait Geofabrik (environ 340 Mo)');
  const rep = await fetch(URL_GEOFABRIK, { headers: { 'User-Agent': 'balade-generateur-rues' } });
  if (!rep.ok) throw new Error(`Geofabrik a répondu ${rep.status}`);
  await pipeline(Readable.fromWeb(rep.body), createWriteStream(fichier + '.part'));
  renameSync(fichier + '.part', fichier);
  return fichier;
}

async function extraireGeofabrik() {
  const extrait = join(CACHE, 'geofabrik-petite-couronne.v8');
  const pbf = await telechargerPbf();
  if (!RAFRAICHIR && existsSync(extrait) && statSync(extrait).mtimeMs > statSync(pbf).mtimeMs) {
    console.log('Extrait déjà filtré, lecture du cache');
    return deserialize(readFileSync(extrait));
  }

  const dansZone = dansLarge;
  const dansMarge = (lat, lon) =>
    lat >= LARGE.sud - MARGE && lat <= LARGE.nord + MARGE && lon >= LARGE.ouest - MARGE && lon <= LARGE.est + MARGE;

  // Passage 1 : les relations, pour savoir de quelles voies on aura besoin.
  console.log('Passage 1 sur 3 : relations');
  const relations = [];
  const voiesDeRelation = new Set();
  lirePbf(pbf, {
    relations(id, tags, membres) {
      const fond = estFond(tags, true), zone = estZone(tags), dep = estDepartement(tags);
      if (!fond && !zone && !dep) return;
      relations.push({ id, tags, membres, genre: dep ? 'departements' : zone ? 'zones' : 'fond' });
      for (const m of membres) if (m.type === 'way') voiesDeRelation.add(m.ref);
    },
  });

  // Passage 2 : les noeuds autour de la zone, rangés par identifiant croissant.
  console.log('Passage 2 sur 3 : noeuds');
  let ids = new Float64Array(1 << 23), lats = new Int32Array(1 << 23), lons = new Int32Array(1 << 23);
  let n = 0, trie = true;
  lirePbf(pbf, {
    noeuds(id, lat, lon) {
      if (!dansMarge(lat, lon)) return;
      if (n === ids.length) {
        const agrandir = (a, T) => { const b = new T(a.length * 2); b.set(a); return b; };
        ids = agrandir(ids, Float64Array); lats = agrandir(lats, Int32Array); lons = agrandir(lons, Int32Array);
      }
      if (n && id < ids[n - 1]) trie = false;
      ids[n] = id; lats[n] = Math.round(lat * 1e7); lons[n] = Math.round(lon * 1e7); n++;
    },
  });
  if (!trie) throw new Error('Noeuds non triés dans l\'extrait');
  console.log(`  ${n} noeuds gardés`);
  const position = (id) => {
    let a = 0, b = n - 1;
    while (a <= b) {
      const m = (a + b) >> 1;
      if (ids[m] === id) return { lat: lats[m] / 1e7, lon: lons[m] / 1e7 };
      if (ids[m] < id) a = m + 1; else b = m - 1;
    }
    return null;
  };

  // Passage 3 : les voies, avec leur géométrie.
  console.log('Passage 3 sur 3 : voies');
  const elements = { voies: new Map(), fond: [], zones: [], departements: [] };
  const geometries = new Map(); // voies membres de relations
  let voiesIncompletes = 0;
  lirePbf(pbf, {
    voies(id, tags, refs) {
      const voie = estVoie(tags), fond = estFond(tags, false), membre = voiesDeRelation.has(id);
      if (!voie && !fond && !membre) return;
      const geometrie = refs.map(position);
      if (membre) geometries.set(id, geometrie);
      if (!voie && !fond) return;
      if (!geometrie.some((p) => p && dansZone(p.lat, p.lon))) return;
      if (voie) {
        // Une voie qui sort de la marge : rare, on la compte pour le savoir.
        if (geometrie.some((p) => !p)) { voiesIncompletes++; return; }
        elements.voies.set(id, { type: 'way', id, tags, nodes: refs, geometry: geometrie });
      } else {
        elements.fond.push({ type: 'way', id, tags, geometry: geometrie.filter(Boolean) });
      }
    },
  });
  if (voiesIncompletes) console.log(`  ${voiesIncompletes} voies ignorées car elles sortent de la marge`);

  // Relations gardées si un de leurs membres touche la zone.
  for (const r of relations) {
    const membres = r.membres
      .filter((m) => m.type === 'way' && geometries.has(m.ref))
      .map((m) => ({ type: 'way', ref: m.ref, role: m.role, geometry: geometries.get(m.ref).filter(Boolean) }));
    if (!membres.some((m) => m.geometry.some((p) => dansZone(p.lat, p.lon)))) continue;
    const el = { type: 'relation', id: r.id, tags: r.tags, members: membres };
    elements[r.genre].push(el);
  }

  writeFileSync(extrait, serialize(elements));
  return elements;
}

// --- Source Overpass --------------------------------------------------------

async function telechargerOverpass() {
  const elements = { voies: new Map(), fond: [], zones: [], departements: [] };
  const { sud: S, ouest: O, nord: N_, est: E } = LARGE;
  const b = `(${S},${O},${N_},${E})`;

  const deps = await overpass(
    'pc-departements',
    `[out:json][timeout:300];relation["boundary"="administrative"]["admin_level"="6"]["ref"~"^(${DEPARTEMENTS.join('|')})$"]${b};out body geom qt;`,
  );
  elements.departements = deps.elements;

  // Les voies, en 5 x 5 morceaux pour ne pas dépasser les limites d'Overpass.
  const N = 5;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const s = S + ((N_ - S) * i) / N, n = S + ((N_ - S) * (i + 1)) / N;
      const o = O + ((E - O) * j) / N, e = O + ((E - O) * (j + 1)) / N;
      const types = TYPES_VOIE.join('|');
      const donnees = await overpass(
        `pc-voies-${i}-${j}`,
        `[out:json][timeout:300];way["highway"~"^(${types})$"](${s},${o},${n},${e});out body geom qt;`,
      );
      for (const el of donnees.elements) elements.voies.set(el.id, el);
    }
  }

  const fond = await overpass(
    'pc-fond',
    `[out:json][timeout:300];(
      way["natural"="water"]${b}; relation["natural"="water"]${b};
      way["waterway"="riverbank"]${b}; relation["waterway"="riverbank"]${b};
      way["leisure"="park"]${b}; relation["leisure"="park"]${b};
      way["leisure"="garden"]["access"!="private"]${b};
      way["landuse"="forest"]${b}; relation["landuse"="forest"]${b};
      way["natural"="wood"]${b}; relation["natural"="wood"]${b};
    );out body geom qt;`,
  );
  elements.fond = fond.elements;

  const zones = await overpass(
    'pc-zones',
    `[out:json][timeout:300];relation["boundary"="administrative"]["admin_level"~"^(8|9)$"]${b};out body geom qt;`,
  );
  elements.zones = zones.elements;
  return elements;
}

// ---------------------------------------------------------------------------
// Géométrie (en mètres, origine au coin sud-ouest)

const versM = ([lat, lon]) => [(lon - OUEST) * M_PAR_DEG_LON, (lat - SUD) * M_PAR_DEG_LAT];

function quantifier([x, y]) {
  return [
    Math.max(0, Math.min(QUANT, Math.round((x / LARGEUR_M) * QUANT))),
    Math.max(0, Math.min(QUANT, Math.round((y / HAUTEUR_M) * QUANT))),
  ];
}

function distSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// Douglas-Peucker : retire les points qui ne changent presque pas le tracé.
function simplifier(pts, tol) {
  if (pts.length <= 2) return pts;
  const garder = new Uint8Array(pts.length);
  garder[0] = garder[pts.length - 1] = 1;
  const pile = [[0, pts.length - 1]];
  while (pile.length) {
    const [i, j] = pile.pop();
    let max = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distSegment(pts[k], pts[i], pts[j]);
      if (d > max) { max = d; idx = k; }
    }
    if (max > tol) {
      garder[idx] = 1;
      pile.push([i, idx], [idx, j]);
    }
  }
  return pts.filter((_, k) => garder[k]);
}

// Découpe une ligne au bord de la zone. Renvoie les morceaux à l'intérieur.
function decouperLigne(pts) {
  const dedans = ([x, y]) => x >= 0 && x <= LARGEUR_M && y >= 0 && y <= HAUTEUR_M;
  const morceaux = [];
  let courant = [];
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    if (k > 0) {
      const a = pts[k - 1];
      const c = clipLiangBarsky(a, p);
      if (c) {
        if (!courant.length) courant.push(c[0]);
        courant.push(c[1]);
        if (!dedans(p)) { morceaux.push(courant); courant = []; }
      } else if (courant.length) { morceaux.push(courant); courant = []; }
    } else if (dedans(p)) {
      courant.push(p);
    }
  }
  if (courant.length) morceaux.push(courant);
  return morceaux
    .map((m) => m.filter((p, i) => i === 0 || p[0] !== m[i - 1][0] || p[1] !== m[i - 1][1]))
    .filter((m) => m.length >= 2);
}

function clipLiangBarsky(a, b) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0], LARGEUR_M - a[0], a[1], HAUTEUR_M - a[1]];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; continue; }
    const r = q[i] / p[i];
    if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

// Sutherland-Hodgman : découpe un anneau de polygone au bord de la zone.
function decouperAnneau(pts) {
  const bords = [
    (p) => p[0] >= 0, (p) => p[0] <= LARGEUR_M, (p) => p[1] >= 0, (p) => p[1] <= HAUTEUR_M,
  ];
  const inter = [
    (a, b) => { const t = -a[0] / (b[0] - a[0]); return [0, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (LARGEUR_M - a[0]) / (b[0] - a[0]); return [LARGEUR_M, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = -a[1] / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), 0]; },
    (a, b) => { const t = (HAUTEUR_M - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), HAUTEUR_M]; },
  ];
  let sortie = pts;
  for (let e = 0; e < 4; e++) {
    const entree = sortie;
    sortie = [];
    for (let k = 0; k < entree.length; k++) {
      const cur = entree[k], prec = entree[(k + entree.length - 1) % entree.length];
      const dc = bords[e](cur), dp = bords[e](prec);
      if (dc) {
        if (!dp) sortie.push(inter[e](prec, cur));
        sortie.push(cur);
      } else if (dp) sortie.push(inter[e](prec, cur));
    }
    if (!sortie.length) break;
  }
  return sortie;
}

function pointDansAnneaux(p, anneaux) {
  let dedans = false;
  for (const r of anneaux) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) &&
          p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) {
        dedans = !dedans;
      }
    }
  }
  return dedans;
}

function boite(anneaux) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of anneaux) for (const [x, y] of r) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y;
    if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  return b;
}

function milieu(pts) {
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  let reste = total / 2;
  for (let k = 1; k < pts.length; k++) {
    const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (reste <= l) {
      const t = l ? reste / l : 0;
      return [pts[k - 1][0] + t * (pts[k][0] - pts[k - 1][0]), pts[k - 1][1] + t * (pts[k][1] - pts[k - 1][1])];
    }
    reste -= l;
  }
  return pts[0];
}

// Assemble les morceaux d'une relation multipolygone en anneaux fermés.
function assemblerAnneaux(morceaux) {
  const cle = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const restants = morceaux.filter((m) => m.length >= 2).map((m) => m.slice());
  const anneaux = [];
  while (restants.length) {
    const anneau = restants.shift();
    let progres = true;
    while (cle(anneau[0]) !== cle(anneau[anneau.length - 1]) && progres) {
      progres = false;
      const fin = cle(anneau[anneau.length - 1]);
      for (let k = 0; k < restants.length; k++) {
        const m = restants[k];
        if (cle(m[0]) === fin) { anneau.push(...m.slice(1)); }
        else if (cle(m[m.length - 1]) === fin) { anneau.push(...m.slice(0, -1).reverse()); }
        else continue;
        restants.splice(k, 1);
        progres = true;
        break;
      }
    }
    if (anneau.length >= 4) anneaux.push(anneau);
  }
  return anneaux;
}

const geomLatLon = (g) => g.map((p) => [p.lat, p.lon]);

// Un élément OSM (chemin fermé ou relation) en liste d'anneaux en mètres.
function anneauxDe(el, conv = versM) {
  if (el.type === 'way') {
    if (!el.geometry || el.geometry.length < 4) return [];
    const pts = geomLatLon(el.geometry);
    const a = pts[0], z = pts[pts.length - 1];
    if (a[0] !== z[0] || a[1] !== z[1]) return [];
    return [pts.map(conv)];
  }
  const morceaux = (el.members ?? [])
    .filter((m) => m.type === 'way' && m.geometry && (m.role === 'outer' || m.role === 'inner' || m.role === ''))
    .map((m) => geomLatLon(m.geometry.filter((p) => p)));
  return assemblerAnneaux(morceaux).map((r) => r.map(conv));
}

// Prépare un polygone pour le fichier : découpé au bord, simplifié, quantifié.
function preparerAnneaux(anneaux) {
  return anneaux
    .map((r) => simplifier(decouperAnneau(r), TOLERANCE_FOND_M))
    .filter((r) => r.length >= 3)
    .map((r) => r.map(quantifier));
}

// ---------------------------------------------------------------------------
// Traitement

function voieRetenue(t) {
  if (!TYPES_VOIE.includes(t.highway)) return false;
  // Voies privées et interdites aux piétons.
  if ((t.access === 'private' || t.access === 'no') && !['yes', 'designated', 'permissive'].includes(t.foot)) return false;
  if (t.foot === 'no' || t.foot === 'private') return false;
  // Trottoirs et passages piétons dessinés à part : la rue existe déjà.
  if (['sidewalk', 'crossing', 'traffic_island'].includes(t.footway)) return false;
  if (['sidewalk', 'crossing'].includes(t.path) || ['sidewalk', 'crossing'].includes(t.cycleway)) return false;
  // Places piétonnes dessinées comme des surfaces : leur contour n'est pas une rue.
  if (t.area === 'yes') return false;
  // Couloirs intérieurs (gares, centres commerciaux, métro).
  if (t.indoor === 'yes' || t.indoor === 'corridor') return false;
  if (['footway', 'path', 'steps'].includes(t.highway) && Number(t.layer) < 0 && t.tunnel) return false;
  return true;
}

function principal() {
  return telecharger().then((brut) => {
    console.log(`Voies téléchargées : ${brut.voies.size}`);

    // Départements : leurs limites fixent le rectangle de référence.
    const deps = brut.departements.map((el) => ({ nom: el.tags?.name, anneaux: anneauxDe(el, (p) => p) }));
    const trouves = deps.filter((d) => d.anneaux.length).map((d) => d.nom);
    console.log(`Départements : ${trouves.join(', ')}`);
    if (trouves.length !== DEPARTEMENTS.length) throw new Error('Il manque un département');
    const [bs, bo, bn, be] = boite(deps.flatMap((d) => d.anneaux));
    const M = 0.002; // petite marge, pour ne rien couper au bord
    fixerBornes(bs - M, bo - M, bn + M, be + M);
    console.log(`Rectangle : ${SUD.toFixed(3)} à ${NORD.toFixed(3)}, ${OUEST.toFixed(3)} à ${EST.toFixed(3)} ` +
      `(${(LARGEUR_M / 1000).toFixed(1)} x ${(HAUTEUR_M / 1000).toFixed(1)} km)`);
    const depsM = deps.map((d) => {
      const anneaux = d.anneaux.map((r) => r.map(versM));
      return { anneaux, boite: boite(anneaux) };
    });
    const dansBoite = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
    const dansPetiteCouronne = (p) => depsM.some((d) => dansBoite(p, d.boite) && pointDansAnneaux(p, d.anneaux));

    // Fond : eau et parcs qui touchent la petite couronne.
    const fond = [];
    for (const el of brut.fond) {
      const t = el.tags ?? {};
      const genre = t.natural === 'water' || t.waterway === 'riverbank' ? 0 : 1;
      const brutM = anneauxDe(el);
      if (!brutM.some((r) => r.some(dansPetiteCouronne))) continue;
      const anneaux = preparerAnneaux(brutM);
      if (anneaux.length) fond.push({ genre, ref: 0, anneaux, brut: brutM });
    }

    // Zones : arrondissements de Paris (niveau 9) et communes des trois
    // départements (niveau 8), reconnus par leur code INSEE. Ensemble, elles
    // couvrent exactement la petite couronne.
    const zones = [];
    for (const el of brut.zones) {
      const t = el.tags ?? {};
      const insee = t['ref:INSEE'] ?? '';
      if (!t.name) continue;
      if (t.admin_level === '9' && !/^751\d\d$/.test(insee)) continue;
      if (t.admin_level === '8' && !DEPARTEMENTS.slice(1).includes(insee.slice(0, 2))) continue;
      const anneauxM = anneauxDe(el);
      if (!anneauxM.length) continue;
      const anneauxQ = preparerAnneaux(anneauxM);
      if (!anneauxQ.length) continue;
      zones.push({
        type: t.admin_level === '9' ? 'arrondissement' : 'commune',
        nom: t.name,
        anneaux: anneauxM,
        anneauxQ,
        boite: boite(anneauxM),
      });
    }
    zones.sort((a, b) => a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
    if (zones.length > 254) throw new Error('Trop de zones pour un octet');
    console.log(`Zones : ${zones.length}`);

    // Parcs et bois, pour garder les pistes cyclables qui y servent de chemins.
    const parcs = fond.filter((f) => f.genre === 1).map((f) => ({ anneaux: f.brut, boite: boite(f.brut) }));
    const dansUnParc = (p) => parcs.some((pc) => dansBoite(p, pc.boite) && pointDansAnneaux(p, pc.anneaux));

    // Filtrage des voies.
    const voies = [];
    let cyclablesGardees = 0, cyclablesExclues = 0;
    for (const v of brut.voies.values()) {
      const t = v.tags ?? {};
      if (!voieRetenue(t) || !v.geometry || v.geometry.length < 2) continue;
      const pts = geomLatLon(v.geometry).map(versM);
      if (t.highway === 'cycleway') {
        if (!dansUnParc(milieu(pts))) { cyclablesExclues++; continue; }
        cyclablesGardees++;
      }
      voies.push({ id: v.id, tags: t, noeuds: v.nodes, pts });
    }
    console.log(`Voies retenues : ${voies.length} (pistes cyclables gardées dans les parcs : ${cyclablesGardees}, exclues : ${cyclablesExclues})`);

    // Carrefours : un noeud partagé par plusieurs voies, ou utilisé deux fois.
    const usage = new Map();
    for (const v of voies) {
      v.noeuds.forEach((n, k) => {
        const poids = k === 0 || k === v.noeuds.length - 1 ? 1 : 2;
        usage.set(n, (usage.get(n) ?? 0) + poids);
      });
    }

    // Noms.
    const noms = [];
    const indexNom = new Map();
    const nomDe = (n) => {
      if (!n) return 0xffff;
      if (!indexNom.has(n)) { indexNom.set(n, noms.length); noms.push(n); }
      return indexNom.get(n);
    };

    // Segments : chaque voie coupée aux carrefours, puis au bord de la zone.
    const segments = [];
    let horsZone = 0;
    for (const v of voies) {
      const coupures = [0];
      for (let k = 1; k < v.noeuds.length - 1; k++) if (usage.get(v.noeuds[k]) > 2) coupures.push(k);
      coupures.push(v.noeuds.length - 1);
      let partie = 0;
      for (let c = 0; c < coupures.length - 1; c++) {
        const tronçon = v.pts.slice(coupures[c], coupures[c + 1] + 1);
        for (const morceau of decouperLigne(tronçon)) {
          const simple = simplifier(morceau, TOLERANCE_RUE_M);
          const q = simple.map(quantifier).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
          if (q.length < 2) continue;
          const m = milieu(simple);
          // Hors des arrondissements et communes retenus : hors petite couronne.
          let zone = -1;
          for (let z = 0; z < zones.length; z++) {
            if (dansBoite(m, zones[z].boite) && pointDansAnneaux(m, zones[z].anneaux)) { zone = z; break; }
          }
          if (zone < 0) { horsZone++; continue; }
          segments.push({
            voie: v.id,
            partie: partie++,
            type: TYPES_VOIE.indexOf(v.tags.highway),
            nom: nomDe(v.tags.name),
            zone,
            q,
          });
        }
      }
      if (partie > 0xffff) throw new Error(`Trop de parties pour la voie ${v.id}`);
    }
    if (noms.length >= 0xffff) throw new Error('Trop de noms pour 16 bits');
    console.log(`Segments : ${segments.length} (hors petite couronne écartés : ${horsZone}), noms : ${noms.length}`);

    // Index par grille : chaque case liste les segments qui la touchent.
    const colonnes = Math.ceil(LARGEUR_M / CELLULE_M);
    const lignes = Math.ceil(HAUTEUR_M / CELLULE_M);
    const cases = Array.from({ length: colonnes * lignes }, () => []);
    const versCase = (qx, qy) => [
      Math.min(colonnes - 1, Math.floor(((qx / QUANT) * LARGEUR_M) / CELLULE_M)),
      Math.min(lignes - 1, Math.floor(((qy / QUANT) * HAUTEUR_M) / CELLULE_M)),
    ];
    segments.forEach((s, idx) => {
      const vues = new Set();
      for (let k = 1; k < s.q.length; k++) {
        const [c0, l0] = versCase(Math.min(s.q[k - 1][0], s.q[k][0]), Math.min(s.q[k - 1][1], s.q[k][1]));
        const [c1, l1] = versCase(Math.max(s.q[k - 1][0], s.q[k][0]), Math.max(s.q[k - 1][1], s.q[k][1]));
        for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) {
          const i = l * colonnes + c;
          if (!vues.has(i)) { vues.add(i); cases[i].push(idx); }
        }
      }
    });

    mkdirSync(SORTIE, { recursive: true });
    ecrireRues(segments, cases, colonnes, lignes);
    ecrireFond(fond, zones);
    writeFileSync(join(SORTIE, 'rues-noms.txt'), noms.map((n) => n.replace(/[\r\n]/g, ' ')).join('\n'));
    writeFileSync(join(SORTIE, 'zones.txt'), zones.map((z) => `${z.type}\t${z.nom}`).join('\n'));

    let total = 0;
    for (const f of ['rues.bin', 'rues-noms.txt', 'fond.bin', 'zones.txt']) {
      const taille = statSync(join(SORTIE, f)).size;
      total += taille;
      console.log(`  ${f} : ${(taille / 1024 / 1024).toFixed(2)} Mo`);
    }
    console.log(`Total : ${(total / 1024 / 1024).toFixed(2)} Mo`);
  });
}

// ---------------------------------------------------------------------------
// Écriture binaire (petit-boutiste, sections alignées sur 4 octets)

class Ecrivain {
  constructor() { this.parties = []; this.taille = 0; }
  ajouter(tableau) {
    const octets = new Uint8Array(tableau.buffer, tableau.byteOffset, tableau.byteLength);
    this.parties.push(octets);
    this.taille += octets.length;
    const reste = this.taille % 4;
    if (reste) { this.parties.push(new Uint8Array(4 - reste)); this.taille += 4 - reste; }
  }
  ecrire(fichier) { writeFileSync(join(SORTIE, fichier), Buffer.concat(this.parties)); }
}

const MAGIQUE_RUES = 0x53455552; // « RUES »
const MAGIQUE_FOND = 0x444e4f46; // « FOND »
const VERSION = 1;

function ecrireRues(segments, cases, colonnes, lignes) {
  const nbPts = segments.reduce((s, x) => s + x.q.length, 0);
  const nbIndex = cases.reduce((s, c) => s + c.length, 0);

  const entete = new Uint32Array(16);
  entete.set([MAGIQUE_RUES, VERSION, segments.length, nbPts, colonnes, lignes, nbIndex, CELLULE_M]);
  const bornes = new Float64Array([SUD, OUEST, NORD, EST]);

  const debutPts = new Uint32Array(segments.length + 1);
  const pts = new Uint16Array(nbPts * 2);
  const voie = new Uint32Array(segments.length);
  const partie = new Uint16Array(segments.length);
  const nom = new Uint16Array(segments.length);
  const type = new Uint8Array(segments.length);
  const zone = new Uint8Array(segments.length);
  let p = 0;
  segments.forEach((s, i) => {
    debutPts[i] = p;
    for (const [x, y] of s.q) { pts[p * 2] = x; pts[p * 2 + 1] = y; p++; }
    voie[i] = s.voie; partie[i] = s.partie; nom[i] = s.nom; type[i] = s.type; zone[i] = s.zone;
  });
  debutPts[segments.length] = p;

  const debutCase = new Uint32Array(cases.length + 1);
  const contenu = new Uint32Array(nbIndex);
  let k = 0;
  cases.forEach((c, i) => { debutCase[i] = k; for (const s of c) contenu[k++] = s; });
  debutCase[cases.length] = k;

  const e = new Ecrivain();
  for (const t of [entete, bornes, debutPts, pts, voie, partie, nom, type, zone, debutCase, contenu]) e.ajouter(t);
  e.ecrire('rues.bin');
}

function ecrireFond(fond, zones) {
  const polygones = [
    ...fond.map((f) => ({ genre: f.genre, ref: 0, anneaux: f.anneaux })),
    ...zones.map((z, i) => ({ genre: GENRES_FOND.indexOf('zone'), ref: i, anneaux: z.anneauxQ })),
  ];
  const nbAnneaux = polygones.reduce((s, x) => s + x.anneaux.length, 0);
  const nbPts = polygones.reduce((s, x) => s + x.anneaux.reduce((t, r) => t + r.length, 0), 0);

  const entete = new Uint32Array(8);
  entete.set([MAGIQUE_FOND, VERSION, polygones.length, nbAnneaux, nbPts]);
  const debutAnneaux = new Uint32Array(polygones.length + 1);
  const debutPts = new Uint32Array(nbAnneaux + 1);
  const pts = new Uint16Array(nbPts * 2);
  const ref = new Uint16Array(polygones.length);
  const genre = new Uint8Array(polygones.length);
  let a = 0, p = 0;
  polygones.forEach((poly, i) => {
    debutAnneaux[i] = a; ref[i] = poly.ref; genre[i] = poly.genre;
    for (const r of poly.anneaux) {
      debutPts[a++] = p;
      for (const [x, y] of r) { pts[p * 2] = x; pts[p * 2 + 1] = y; p++; }
    }
  });
  debutAnneaux[polygones.length] = a;
  debutPts[nbAnneaux] = p;

  const e = new Ecrivain();
  for (const t of [entete, debutAnneaux, debutPts, pts, ref, genre]) e.ajouter(t);
  e.ecrire('fond.bin');
}

principal().catch((err) => { console.error(err); process.exit(1); });
