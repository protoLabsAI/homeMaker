/**
 * Shared SQLite database for all homeMaker modules.
 *
 * Provides a singleton Database instance backed by `homemaker.db` in the
 * configured DATA_DIR. All home-management tables are created (if they do
 * not already exist) on the first call to `getHomemakerDb()`.
 */

import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';

const logger = createLogger('homemaker-db');

let instance: BetterSqlite3.Database | null = null;

/**
 * Run all CREATE TABLE IF NOT EXISTS migrations.
 *
 * Each table is defined in a single `exec` call so SQLite processes them
 * as one batch. Foreign-key references between tables rely on declaration
 * order (referenced tables appear first).
 */
function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      location TEXT,
      purchaseDate TEXT,
      purchasePrice REAL,
      warrantyExpiration TEXT,
      modelNumber TEXT,
      serialNumber TEXT,
      manufacturer TEXT,
      manualUrl TEXT,
      replacementCost REAL,
      notes TEXT,
      sensorIds TEXT DEFAULT '[]',
      photoUrls TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      category TEXT,
      notes TEXT,
      rating INTEGER,
      lastContactedAt TEXT,
      lastServiceDate TEXT,
      linkedAssetIds TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      intervalDays INTEGER,
      lastCompletedAt TEXT,
      nextDueAt TEXT,
      assetId TEXT REFERENCES assets(id),
      category TEXT,
      estimatedCostUsd REAL,
      vendorId TEXT REFERENCES vendors(id),
      completedById TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      sensorId TEXT NOT NULL,
      data TEXT NOT NULL,
      receivedAt TEXT NOT NULL,
      PRIMARY KEY (sensorId, receivedAt)
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      budgetedAmount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      categoryId TEXT REFERENCES budget_categories(id),
      description TEXT,
      date TEXT NOT NULL,
      recurrence TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      tags TEXT DEFAULT '[]',
      username TEXT,
      url TEXT,
      encryptedValue TEXT NOT NULL,
      iv TEXT NOT NULL,
      tag TEXT NOT NULL,
      encryptedNotes TEXT,
      notesIv TEXT,
      notesTag TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  logger.info('All homemaker tables initialized');
}

/**
 * Return the shared homeMaker database instance.
 *
 * On first invocation the database file is created (if absent), WAL mode
 * and foreign keys are enabled, and all table migrations are executed.
 * Subsequent calls return the same instance.
 */
export function getHomemakerDb(): BetterSqlite3.Database {
  if (instance) {
    return instance;
  }

  const dataDir = process.env.DATA_DIR ?? './data';
  mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'homemaker.db');
  logger.info(`Opening homemaker database at ${dbPath}`);

  const db = new BetterSqlite3.default(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  instance = db;
  return db;
}
