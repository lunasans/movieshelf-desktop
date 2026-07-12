import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export function setupDatabase(): void {
  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  db = new Database(join(userDataPath, 'movieshelf.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
}

export function applyMigrations(target: Database.Database): void {
  runMigrations(target)
}

function runMigrations(instance: Database.Database = db): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      year        INTEGER,
      genre       TEXT,
      director    TEXT,
      runtime     INTEGER,
      rating      REAL,
      rating_age  INTEGER,
      overview    TEXT,
      cover_path  TEXT,
      backdrop_path TEXT,
      actors_names TEXT,
      trailer_url TEXT,
      collection_type TEXT DEFAULT 'Film',
      tag         TEXT,
      tmdb_id     INTEGER,
      remote_id   INTEGER,
      synced_at   TEXT,
      is_deleted  INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS actors (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id       INTEGER UNIQUE,
      name            TEXT NOT NULL,
      bio             TEXT,
      birthday        TEXT,
      place_of_birth  TEXT,
      image_path      TEXT,
      tmdb_id         INTEGER,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS film_actor (
      film_id         INTEGER,
      actor_id        INTEGER,
      role            TEXT,
      is_main_role    INTEGER DEFAULT 0,
      PRIMARY KEY (film_id, actor_id),
      FOREIGN KEY (film_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
    );

    -- Default settings
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('mode', 'standalone'),
      ('shelf_url', ''),
      ('shelf_token', '');
  `)

  // Migrations for existing tables
  try { instance.exec('ALTER TABLE movies ADD COLUMN actors_names TEXT') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN backdrop_path TEXT') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN trailer_url TEXT') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN is_deleted INTEGER DEFAULT 0') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN tag TEXT') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN is_boxset INTEGER DEFAULT 0') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN boxset_parent_id INTEGER') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN view_count INTEGER DEFAULT 0') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN is_watched INTEGER DEFAULT 0') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN in_collection INTEGER DEFAULT 1') } catch (e) {}
  try { instance.exec('ALTER TABLE movies ADD COLUMN collection_no INTEGER') } catch (e) {}

  // Cleanup duplicates before creating unique index
  try {
    instance.exec(`
      DELETE FROM movies
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM movies
        WHERE remote_id IS NOT NULL
        GROUP BY remote_id
      ) AND remote_id IS NOT NULL
    `)
    instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_remote_id ON movies(remote_id)')
  } catch (e) {
    console.error('Migration failed:', e)
  }

  // Custom lists (der polymorphe Pivot list_items wird weiter unten erstellt;
  // ein evtl. noch vorhandenes altes list_movies wird dort migriert und gedroppt).
  instance.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      remote_id  INTEGER,
      created_at TEXT    DEFAULT (datetime('now')),
      updated_at TEXT    DEFAULT (datetime('now')),
      synced_at  TEXT
    );
  `)

  try { instance.exec('ALTER TABLE lists ADD COLUMN remote_id INTEGER') } catch (e) {}
  try { instance.exec('ALTER TABLE lists ADD COLUMN synced_at TEXT') } catch (e) {}

  // Seasons & Episodes for series
  instance.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id       INTEGER UNIQUE,
      movie_id        INTEGER NOT NULL,
      season_number   INTEGER NOT NULL,
      title           TEXT,
      overview        TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id       INTEGER UNIQUE,
      season_id       INTEGER NOT NULL,
      episode_number  INTEGER NOT NULL,
      title           TEXT,
      overview        TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
    );
  `)

  // Deduplicate episodes before adding unique index on (season_id, episode_number).
  // Prefer the row with remote_id when available; otherwise keep the highest id.
  try {
    instance.exec(`
      DELETE FROM episodes
      WHERE id NOT IN (
        SELECT COALESCE(
          MAX(CASE WHEN remote_id IS NOT NULL THEN id END),
          MAX(id)
        )
        FROM episodes
        GROUP BY season_id, episode_number
      )
    `)
    instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_season_ep ON episodes(season_id, episode_number)')
  } catch (e) {}

  // ── Datenmodell-Split: externe Filme (nicht in Sammlung) + polymorpher Listen-Pivot ──
  instance.exec(`
    CREATE TABLE IF NOT EXISTS external_movies (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id     INTEGER,
      title         TEXT NOT NULL,
      year          INTEGER,
      genre         TEXT,
      director      TEXT,
      runtime       INTEGER,
      rating        REAL,
      rating_age    INTEGER,
      overview      TEXT,
      collection_type TEXT,
      cover_path    TEXT,
      backdrop_path TEXT,
      trailer_url   TEXT,
      tmdb_id       INTEGER,
      synced_at     TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_external_remote_id ON external_movies(remote_id) WHERE remote_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS list_items (
      list_id   INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_id   INTEGER NOT NULL,
      added_at  TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (list_id, item_type, item_id),
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );

    -- Tombstones für lokal aus Listen entfernte Items: der Listen-Sync arbeitet
    -- als UNION und kann ohne diese Merker nicht unterscheiden, ob ein Item lokal
    -- entfernt oder serverseitig neu hinzugefügt wurde. Nach erfolgreichem Push
    -- werden die Merker der Liste gelöscht. Referenziert die Server-remote_id des
    -- Items (nur synchronisierte Items brauchen einen Tombstone).
    CREATE TABLE IF NOT EXISTS list_item_tombstones (
      list_id    INTEGER NOT NULL,
      item_type  TEXT NOT NULL,
      remote_id  INTEGER NOT NULL,
      removed_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (list_id, item_type, remote_id),
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );
  `)

  // Einmalige Migration: solange list_movies existiert, in list_items überführen und
  // lokale in_collection=0-Filme nach external_movies auslagern. Danach list_movies droppen.
  const hasListMovies = instance.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='list_movies'"
  ).get()
  if (hasListMovies) {
    try {
      const migrate = instance.transaction(() => {
        const externals = instance.prepare('SELECT * FROM movies WHERE in_collection = 0').all() as any[]
        const insExt = instance.prepare(`
          INSERT INTO external_movies
            (remote_id, title, year, genre, director, runtime, rating, rating_age, overview,
             collection_type, cover_path, backdrop_path, trailer_url, tmdb_id, synced_at, created_at, updated_at)
          VALUES
            (@remote_id, @title, @year, @genre, @director, @runtime, @rating, @rating_age, @overview,
             @collection_type, @cover_path, @backdrop_path, @trailer_url, @tmdb_id, @synced_at, @created_at, @updated_at)
        `)
        const map = new Map<number, number>()
        for (const m of externals) {
          const r = insExt.run({
            remote_id: m.remote_id ?? null, title: m.title, year: m.year ?? null, genre: m.genre ?? null,
            director: m.director ?? null, runtime: m.runtime ?? null, rating: m.rating ?? null,
            rating_age: m.rating_age ?? null, overview: m.overview ?? null, collection_type: m.collection_type ?? null,
            cover_path: m.cover_path ?? null, backdrop_path: m.backdrop_path ?? null, trailer_url: m.trailer_url ?? null,
            tmdb_id: m.tmdb_id ?? null, synced_at: m.synced_at ?? null,
            created_at: m.created_at ?? null, updated_at: m.updated_at ?? null,
          })
          map.set(m.id, Number(r.lastInsertRowid))
        }

        const insItem = instance.prepare(
          'INSERT OR IGNORE INTO list_items (list_id, item_type, item_id, added_at) VALUES (?, ?, ?, ?)'
        )
        for (const row of instance.prepare('SELECT * FROM list_movies').all() as any[]) {
          if (map.has(row.movie_id)) insItem.run(row.list_id, 'external', map.get(row.movie_id), row.added_at ?? null)
          else insItem.run(row.list_id, 'movie', row.movie_id, row.added_at ?? null)
        }

        instance.exec('DELETE FROM movies WHERE in_collection = 0')
        instance.exec('DROP TABLE list_movies')
      })
      migrate()
    } catch (e) {
      console.error('List-split migration failed:', e)
    }
  }

  // collection_no lückenlos vergeben (NULL-Zeilen nach aktueller Höchstnummer fortschreiben).
  try {
    const nullRows = instance.prepare('SELECT id FROM movies WHERE collection_no IS NULL ORDER BY id').all() as { id: number }[]
    if (nullRows.length) {
      const maxRow = instance.prepare('SELECT COALESCE(MAX(collection_no), 0) AS m FROM movies').get() as { m: number }
      let n = maxRow.m
      const upd = instance.prepare('UPDATE movies SET collection_no = ? WHERE id = ?')
      const tx = instance.transaction(() => { for (const r of nullRows) { n++; upd.run(n, r.id) } })
      tx()
    }
  } catch (e) {}
}
