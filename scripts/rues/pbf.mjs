// Lecteur minimal du format OpenStreetMap .osm.pbf, sans dépendance.
// Format : https://wiki.openstreetmap.org/wiki/PBF_Format
//
// lirePbf(fichier, { noeuds, voies, relations }) parcourt le fichier une fois
// et appelle les fonctions demandées. Les blocs d'un type non demandé sont
// sautés sans être décodés, ce qui rend les passages suivants rapides.

import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// --- Lecture protobuf -------------------------------------------------------

class Lecteur {
  constructor(buf, debut = 0, fin = buf.length) { this.buf = buf; this.pos = debut; this.fin = fin; }
  fini() { return this.pos >= this.fin; }
  // Entier variable non signé, exact jusqu'à 2^53.
  varint() {
    const b = this.buf;
    let r = 0, mul = 1, o;
    do {
      o = b[this.pos++];
      r += (o & 0x7f) * mul;
      mul *= 128;
    } while (o & 0x80);
    return r;
  }
  svarint() { const n = this.varint(); return n % 2 === 1 ? -(n + 1) / 2 : n / 2; }
  // Renvoie [champ, typeDeFil].
  cle() { const k = this.varint(); return [Math.floor(k / 8), k & 7]; }
  octets() { const l = this.varint(); const d = this.pos; this.pos += l; return [d, this.pos]; }
  sauter(fil) {
    if (fil === 0) this.varint();
    else if (fil === 1) this.pos += 8;
    else if (fil === 2) { const l = this.varint(); this.pos += l; }
    else if (fil === 5) this.pos += 4;
    else throw new Error(`Type protobuf inconnu ${fil}`);
  }
  texte([d, f]) { return this.buf.toString('utf8', d, f); }
  // Tableau compacté d'entiers (variables, avec option zigzag et delta).
  compacte([d, f], signe, delta) {
    const sous = new Lecteur(this.buf, d, f);
    const res = [];
    let acc = 0;
    while (!sous.fini()) {
      const v = signe ? sous.svarint() : sous.varint();
      acc = delta ? acc + v : v;
      res.push(acc);
    }
    return res;
  }
}

// --- Fichier ----------------------------------------------------------------

function* blocs(chemin) {
  const fd = openSync(chemin, 'r');
  const taille = fstatSync(fd).size;
  let pos = 0;
  const lire = (n) => {
    const b = Buffer.allocUnsafe(n);
    let lu = 0;
    while (lu < n) lu += readSync(fd, b, lu, n - lu, pos + lu);
    pos += n;
    return b;
  };
  try {
    while (pos < taille) {
      const lenEntete = lire(4).readUInt32BE(0);
      const entete = new Lecteur(lire(lenEntete));
      let type = '', tailleDonnees = 0;
      while (!entete.fini()) {
        const [c, fil] = entete.cle();
        if (c === 1) type = entete.texte(entete.octets());
        else if (c === 3) tailleDonnees = entete.varint();
        else entete.sauter(fil);
      }
      const blob = new Lecteur(lire(tailleDonnees));
      let donnees = null;
      while (!blob.fini()) {
        const [c, fil] = blob.cle();
        if (c === 1) { const [d, f] = blob.octets(); donnees = blob.buf.subarray(d, f); }
        else if (c === 3) { const [d, f] = blob.octets(); donnees = inflateSync(blob.buf.subarray(d, f)); }
        else blob.sauter(fil);
      }
      if (!donnees) throw new Error('Bloc compressé dans un format non pris en charge');
      yield { type, donnees, progression: pos / taille };
    }
  } finally {
    closeSync(fd);
  }
}

// --- Blocs de données -------------------------------------------------------

export function lirePbf(chemin, rappels) {
  let dernier = -1;
  for (const { type, donnees, progression } of blocs(chemin)) {
    const pct = Math.floor(progression * 10);
    if (pct !== dernier) { dernier = pct; process.stdout.write(` ${pct * 10}%`); }
    if (type !== 'OSMData') continue;
    lireBloc(donnees, rappels);
  }
  process.stdout.write('\n');
}

function lireBloc(buf, rappels) {
  const l = new Lecteur(buf);
  let table = null, groupes = [];
  let granularite = 100, decLat = 0, decLon = 0;
  while (!l.fini()) {
    const [c, fil] = l.cle();
    if (c === 1) table = l.octets();
    else if (c === 2) groupes.push(l.octets());
    else if (c === 17) granularite = l.varint();
    else if (c === 19) decLat = l.varint();
    else if (c === 20) decLon = l.varint();
    else l.sauter(fil);
  }

  let chaines = null;
  const textes = () => {
    if (chaines) return chaines;
    chaines = [];
    const t = new Lecteur(buf, table[0], table[1]);
    while (!t.fini()) {
      const [c, fil] = t.cle();
      if (c === 1) chaines.push(t.texte(t.octets())); else t.sauter(fil);
    }
    return chaines;
  };

  for (const [d, f] of groupes) {
    const g = new Lecteur(buf, d, f);
    while (!g.fini()) {
      const [c, fil] = g.cle();
      if (c === 2 && rappels.noeuds) lireNoeudsDenses(g, g.octets(), textes, granularite, decLat, decLon, rappels.noeuds);
      else if (c === 3 && rappels.voies) lireVoie(g, g.octets(), textes, rappels.voies);
      else if (c === 4 && rappels.relations) lireRelation(g, g.octets(), textes, rappels.relations);
      else if (c === 1 && rappels.noeuds) throw new Error('Noeuds non denses non pris en charge');
      else g.sauter(fil);
    }
  }
}

// Les étiquettes des noeuds ne sont décodées que si le rappel en demande
// (quatrième paramètre) : pour les rues, seules les positions comptent.
function lireNoeudsDenses(l, zone, textes, gran, decLat, decLon, rappel) {
  const avecTags = rappel.length >= 4;
  const s = new Lecteur(l.buf, zone[0], zone[1]);
  let ids = [], lats = [], lons = [], kv = [];
  while (!s.fini()) {
    const [c, fil] = s.cle();
    if (c === 1) ids = s.compacte(s.octets(), true, true);
    else if (c === 8) lats = s.compacte(s.octets(), true, true);
    else if (c === 9) lons = s.compacte(s.octets(), true, true);
    else if (c === 10 && avecTags) kv = s.compacte(s.octets(), false, false);
    else s.sauter(fil);
  }
  let k = 0;
  for (let i = 0; i < ids.length; i++) {
    let tags;
    if (avecTags) {
      // Clés et valeurs à la suite, un 0 termine chaque noeud.
      tags = {};
      if (kv.length) {
        const t = textes();
        while (kv[k] !== 0 && k < kv.length) { tags[t[kv[k]]] = t[kv[k + 1]]; k += 2; }
        k++;
      }
    }
    rappel(ids[i], (decLat + gran * lats[i]) * 1e-9, (decLon + gran * lons[i]) * 1e-9, tags);
  }
}

function etiquettes(cles, vals, textes) {
  const t = textes();
  const tags = {};
  for (let i = 0; i < cles.length; i++) tags[t[cles[i]]] = t[vals[i]];
  return tags;
}

function lireVoie(l, zone, textes, rappel) {
  const s = new Lecteur(l.buf, zone[0], zone[1]);
  let id = 0, cles = [], vals = [], refs = [];
  while (!s.fini()) {
    const [c, fil] = s.cle();
    if (c === 1) id = s.varint();
    else if (c === 2) cles = s.compacte(s.octets(), false, false);
    else if (c === 3) vals = s.compacte(s.octets(), false, false);
    else if (c === 8) refs = s.compacte(s.octets(), true, true);
    else s.sauter(fil);
  }
  rappel(id, etiquettes(cles, vals, textes), refs);
}

const TYPES_MEMBRE = ['node', 'way', 'relation'];

function lireRelation(l, zone, textes, rappel) {
  const s = new Lecteur(l.buf, zone[0], zone[1]);
  let id = 0, cles = [], vals = [], roles = [], refs = [], types = [];
  while (!s.fini()) {
    const [c, fil] = s.cle();
    if (c === 1) id = s.varint();
    else if (c === 2) cles = s.compacte(s.octets(), false, false);
    else if (c === 3) vals = s.compacte(s.octets(), false, false);
    else if (c === 8) roles = s.compacte(s.octets(), false, false);
    else if (c === 9) refs = s.compacte(s.octets(), true, true);
    else if (c === 10) types = s.compacte(s.octets(), false, false);
    else s.sauter(fil);
  }
  const t = textes();
  const membres = refs.map((ref, i) => ({ type: TYPES_MEMBRE[types[i]], ref, role: t[roles[i]] }));
  rappel(id, etiquettes(cles, vals, textes), membres);
}
