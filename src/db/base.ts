import * as SQLite from 'expo-sqlite';

// La base de données locale, un fichier sur le téléphone. Rien n'est envoyé ailleurs.
// Elle est ouverte une seule fois, au premier appel, et les tables sont créées si besoin.

let base: SQLite.SQLiteDatabase | null = null;

export function ouvrirBase(): SQLite.SQLiteDatabase {
  if (base) return base;
  base = SQLite.openDatabaseSync('balade.db');
  base.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      precision_m REAL NOT NULL,
      horodatage INTEGER NOT NULL -- millisecondes depuis 1970
    );
    CREATE INDEX IF NOT EXISTS points_horodatage ON points (horodatage);

    CREATE TABLE IF NOT EXISTS cartes_debloquees (
      lieu_id TEXT PRIMARY KEY, -- une seule ligne par lieu
      debloquee_le INTEGER NOT NULL -- millisecondes depuis 1970
    );
  `);
  return base;
}
