/* SQLite (eingebaut in Node, node:sqlite). Eine Datei in DATA_DIR (/var/lib/darts), WAL-Modus, Migrationen über PRAGMA user_version.
   Neue Schema-Änderungen nur als NEUEN Eintrag ans Ende von MIGRATIONS hängen – bestehende nie ändern. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = [
  /* 1: Konten, Sitzungen, Spieldaten, Freundschaften */
  `CREATE TABLE users (
     id            TEXT PRIMARY KEY,
     email         TEXT NOT NULL UNIQUE,          -- normalisiert (klein, ohne Rand-Leerzeichen)
     username      TEXT NOT NULL,                 -- wie eingegeben (Anzeige)
     username_key  TEXT NOT NULL UNIQUE,          -- klein: Eindeutigkeit + Suche
     pw_hash       TEXT NOT NULL,                 -- scrypt$logN$r$p$salt$hash
     created_at    INTEGER NOT NULL,
     updated_at    INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash  TEXT PRIMARY KEY,                -- SHA-256 des Cookie-Tokens (Token selbst wird nie gespeichert)
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at  INTEGER NOT NULL,
     expires_at  INTEGER NOT NULL,
     last_seen   INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE INDEX sessions_expiry ON sessions(expires_at);
   CREATE TABLE user_state (
     user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     rev        INTEGER NOT NULL DEFAULT 0,       -- laufende Änderungsnummer (für Delta-Sync)
     state      TEXT,                             -- JSON: Profile, Einstellungen, laufendes Spiel …
     state_rev  INTEGER NOT NULL DEFAULT 0,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE matches (
     user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     id        TEXT NOT NULL,
     rev       INTEGER NOT NULL,
     deleted   INTEGER NOT NULL DEFAULT 0,        -- Grabstein, damit andere Geräte das Löschen mitbekommen
     game      TEXT,
     ended_at  INTEGER,
     data      TEXT,                              -- JSON des Matches (NULL, wenn gelöscht)
     PRIMARY KEY (user_id, id)
   );
   CREATE INDEX matches_rev ON matches(user_id, rev);
   CREATE TABLE friendships (
     requester_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     addressee_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     status        TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
     created_at    INTEGER NOT NULL,
     responded_at  INTEGER,
     PRIMARY KEY (requester_id, addressee_id),
     CHECK (requester_id <> addressee_id)
   );
   CREATE INDEX friendships_addressee ON friendships(addressee_id);`,
  /* 2: Eigener Caller – selbst eingesprochene Ansagen je Punktzahl (WAV, wenige KB) */
  `CREATE TABLE caller_clips (
     user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     score      INTEGER NOT NULL CHECK (score BETWEEN 0 AND 180),
     mime       TEXT NOT NULL,
     data       BLOB NOT NULL,
     updated_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, score)
   );`,
];

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(join(file, '..'), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db) {
  const v = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = v; i < MIGRATIONS.length; i++) {
    tx(db, () => { db.exec(MIGRATIONS[i]); db.exec(`PRAGMA user_version = ${i + 1}`); });
  }
}

/** Transaktion (sofortige Schreibsperre). node:sqlite ist synchron – zwischen BEGIN und COMMIT läuft nichts anderes. */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
