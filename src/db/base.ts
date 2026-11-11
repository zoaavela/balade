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
      envoye INTEGER NOT NULL DEFAULT 0 -- 1 une fois sauvegardé sur le compte
    );

    CREATE TABLE IF NOT EXISTS cartes_debloquees (
      lieu_id TEXT PRIMARY KEY,
      debloquee_le INTEGER NOT NULL, -- millisecondes depuis 1970
      envoyee INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS etat (
      cle TEXT PRIMARY KEY,
      valeur TEXT NOT NULL
    );
  `);
  compte = { id, base };
  reprendreAnciennesDonnees(base, id);
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
