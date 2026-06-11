const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({
  url: `file:${path.join(__dirname, '..', 'flui.db')}`,
});

/* Helpers que imitam a API síncrona do better-sqlite3 */
async function run(sql, args = []) {
  return db.execute({ sql, args });
}

async function get(sql, args = []) {
  const res = await db.execute({ sql, args });
  if (!res.rows.length) return null;
  return rowToObj(res.columns, res.rows[0]);
}

async function all(sql, args = []) {
  const res = await db.execute({ sql, args });
  return res.rows.map(row => rowToObj(res.columns, row));
}

function rowToObj(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

/* Cria tabelas na primeira execução */
async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'driver',
      car           TEXT    DEFAULT '',
      level         INTEGER DEFAULT 1,
      progress      INTEGER DEFAULT 0,
      charges       INTEGER DEFAULT 0,
      co2_saved     INTEGER DEFAULT 0,
      eco_score     INTEGER DEFAULT 50,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stations (
      id         TEXT    PRIMARY KEY,
      name       TEXT    NOT NULL,
      address    TEXT    NOT NULL,
      connectors TEXT    NOT NULL DEFAULT '[]',
      power      INTEGER NOT NULL DEFAULT 50,
      chargers   INTEGER NOT NULL DEFAULT 4,
      available  INTEGER NOT NULL DEFAULT 4,
      price      TEXT    DEFAULT 'Grátis',
      hours      TEXT    DEFAULT '24 horas',
      amenities  TEXT    DEFAULT '[]',
      status     TEXT    DEFAULT 'Ativo',
      queue      TEXT    DEFAULT 'Baixa',
      rating     REAL    DEFAULT 4.5,
      lat        REAL,
      lng        REAL,
      pos_top    REAL    DEFAULT 50,
      pos_left   REAL    DEFAULT 50,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT    NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      rating     INTEGER NOT NULL,
      text       TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id     TEXT    NOT NULL REFERENCES stations(id),
      user_id        INTEGER NOT NULL REFERENCES users(id),
      connector_type TEXT,
      status         TEXT    DEFAULT 'confirmed',
      expires_at     TEXT,
      created_at     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS charge_history (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id   TEXT    NOT NULL REFERENCES stations(id),
      user_id      INTEGER NOT NULL REFERENCES users(id),
      kwh          REAL,
      duration_min INTEGER,
      cost         REAL,
      created_at   TEXT    DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { db, run, get, all, initDB };
