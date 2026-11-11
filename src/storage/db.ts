import * as SQLite from 'expo-sqlite';

/**
 * Local SQLite database. Versioned with PRAGMA user_version: each migration runs
 * once, in order, inside a transaction. Add new migrations to the end of the list.
 */
const DB_NAME = 'binary-calculator.db';

const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE IF NOT EXISTS prefs (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS history (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     kind TEXT NOT NULL,
     payload TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);`,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version};`);
  }
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null; // allow a retry on the next call
      throw e;
    });
  }
  return dbPromise;
}
