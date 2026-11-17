import * as SQLite from 'expo-sqlite';

// Deux sortes de bases locales, des fichiers sur le téléphone :
// - balade.db, celle de l'appareil : les réglages (accueil déjà vu...), communs à tous.
// - balade-<compte>.db, une par compte : points, cartes débloquées et état de la synchro.
// Changer de compte, c'est changer de fichier : un compte ne voit jamais les données d'un autre.

let appareil: SQLite.SQLiteDatabase | null = null;
let compte: { id: string; base: SQLite.SQLiteDatabase } | null = null;

const ID_VALIDE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// La base de l'appareil, ouverte au premier appel.
export function ouvrirBase(): SQLite.SQLiteDatabase {
  if (appareil) return appareil;
  appareil = SQLite.openDatabaseSync('balade.db');
  appareil.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS reglages (
      cle TEXT PRIMARY KEY,
      valeur TEXT NOT NULL
    );
  `);
  return appareil;
}

// Choisit le compte connecté. Sans effet si c'est déjà lui.
export function utiliserCompte(id: string) {
  if (compte?.id === id) return;
  if (!ID_VALIDE.test(id)) throw new Error('Identifiant de compte invalide');
  compte?.base.closeSync();
  const base = SQLite.openDatabaseSync(`balade-${id}.db`);
  base.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      precision_m REAL NOT NULL,
      horodatage INTEGER NOT NULL UNIQUE, -- millisecondes depuis 1970
      envoye INTEGER NOT NULL DEFAULT 0 -- plus utilisé depuis le T22 : les points ne quittent plus le téléphone
    );

    CREATE TABLE IF NOT EXISTS cartes_debloquees (
      lieu_id TEXT PRIMARY KEY,
      debloquee_le INTEGER NOT NULL, -- millisecondes depuis 1970
      envoyee INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pas_jours (
      jour TEXT PRIMARY KEY, -- AAAA-MM-JJ, heure locale
      pas INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS etat (
      cle TEXT PRIMARY KEY,
      valeur TEXT NOT NULL
    );

    -- Rues parcourues (T19) : une ligne par segment de rue, identifiant du réseau embarqué.
    CREATE TABLE IF NOT EXISTS rues_parcourues (
      segment_id TEXT PRIMARY KEY,
      premiere_fois INTEGER NOT NULL, -- millisecondes depuis 1970
      derniere_fois INTEGER NOT NULL,
      nb_passages INTEGER NOT NULL
    );

    -- Chaque passage sur un segment, pour redessiner les journées sans les points bruts.
    -- L'heure reste sur le téléphone : seul le jour pourra être synchronisé (T22).
    CREATE TABLE IF NOT EXISTS passages (
      segment_id TEXT NOT NULL,
      jour TEXT NOT NULL, -- AAAA-MM-JJ, heure locale
      horodatage INTEGER NOT NULL,
      PRIMARY KEY (segment_id, horodatage)
    );
    CREATE INDEX IF NOT EXISTS passages_jour ON passages (jour, horodatage);

    -- Distance d'une journée, figée avant d'en supprimer les points bruts.
    CREATE TABLE IF NOT EXISTS distances_jour (
      jour TEXT PRIMARY KEY, -- AAAA-MM-JJ, heure locale
      metres REAL NOT NULL
    );
  `);
  // Colonnes ajoutées après coup. recale (T19) : 1 une fois le point recalé sur les rues.
  // envoyee, envoye (T22) : 1 une fois la rue, ou le jour du passage, sauvegardé sur le compte.
  ajouterColonne(base, 'points', 'recale');
  ajouterColonne(base, 'rues_parcourues', 'envoyee');
  ajouterColonne(base, 'passages', 'envoye');
  compte = { id, base };
  reprendreAnciennesDonnees(base, id);
}

function ajouterColonne(base: SQLite.SQLiteDatabase, table: string, colonne: string) {
  const colonnes = base.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`, []);
  if (!colonnes.some((c) => c.name === colonne)) {
    base.execSync(`ALTER TABLE ${table} ADD COLUMN ${colonne} INTEGER NOT NULL DEFAULT 0`);
  }
}

// Uniquement pour les tests : efface la base locale du compte, comme sur un téléphone neuf.
// Les données sauvegardées sur le compte, elles, ne bougent pas.
export function effacerBaseCompte() {
  if (!compte) return;
  const nom = `balade-${compte.id}.db`;
  compte.base.closeSync();
  compte = null;
  SQLite.deleteDatabaseSync(nom);
}

// La base du compte connecté.
export function baseCompte(): SQLite.SQLiteDatabase {
  if (!compte) throw new Error('Aucun compte choisi');
  return compte.base;
}

// Avant les comptes, points et cartes étaient dans balade.db. Ils sont donnés une seule
// fois au premier compte qui se connecte sur ce téléphone, puis retirés de balade.db.
function reprendreAnciennesDonnees(base: SQLite.SQLiteDatabase, id: string) {
  const app = ouvrirBase();
  const tables = app
    .getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('points', 'cartes_debloquees')",
      [],
    )
    .map((t) => t.name);
  if (tables.length === 0) return;

  base.withTransactionSync(() => {
    if (tables.includes('points')) {
      const points = app.getAllSync<{
        latitude: number;
        longitude: number;
        precision_m: number;
        horodatage: number;
      }>('SELECT latitude, longitude, precision_m, horodatage FROM points', []);
      for (const p of points) {
        base.runSync(
          'INSERT OR IGNORE INTO points (latitude, longitude, precision_m, horodatage) VALUES (?, ?, ?, ?)',
          [p.latitude, p.longitude, p.precision_m, Math.round(p.horodatage)],
        );
      }
    }
    if (tables.includes('cartes_debloquees')) {
      const cartes = app.getAllSync<{ lieu_id: string; debloquee_le: number }>(
        'SELECT lieu_id, debloquee_le FROM cartes_debloquees',
        [],
      );
      for (const c of cartes) {
        base.runSync(
          'INSERT OR IGNORE INTO cartes_debloquees (lieu_id, debloquee_le) VALUES (?, ?)',
          [c.lieu_id, c.debloquee_le],
        );
      }
    }
  });

  // Copie faite : on retire les anciennes tables pour qu'aucun autre compte ne les reçoive.
  for (const table of tables) app.execSync(`DROP TABLE ${table}`);
  app.runSync('INSERT OR REPLACE INTO reglages (cle, valeur) VALUES (?, ?)', [
    'anciennes_donnees_donnees_a',
    id,
  ]);
}
