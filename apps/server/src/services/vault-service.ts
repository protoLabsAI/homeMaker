/**
 * VaultService — Encrypted local secrets vault backed by SQLite.
 *
 * All secret values and optional notes are encrypted with AES-256-GCM before
 * being written to disk. The list() method never returns decrypted values.
 *
 * Table schema: vault_entries
 *   id, name, category, tags, username, url,
 *   ciphertext, iv, tag,
 *   notes_ciphertext, notes_iv, notes_tag,
 *   createdAt, updatedAt
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type { VaultEntry, VaultEntryWithValue, SecretCategory } from '@protolabsai/types';
import { getMasterKey, encrypt, decrypt } from '../lib/vault-crypto.js';

const logger = createLogger('VaultService');

/** Parameters for creating a new vault entry */
export interface CreateVaultEntryParams {
  name: string;
  value: string;
  category: SecretCategory;
  tags?: string[];
  username?: string;
  url?: string;
  notes?: string;
}

/** Parameters for updating an existing vault entry */
export interface UpdateVaultEntryParams {
  name?: string;
  value?: string;
  category?: SecretCategory;
  tags?: string[];
  username?: string;
  url?: string;
  notes?: string;
}

export class VaultService {
  private db: BetterSqlite3.Database;
  private masterKey: Buffer;

  constructor(dataDir: string) {
    // Validate the master key early — throws if missing/invalid
    this.masterKey = getMasterKey();

    // Ensure data directory exists
    const vaultDir = path.join(dataDir, 'vault');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    const dbPath = path.join(vaultDir, 'vault.db');
    logger.info(`Initializing vault store at ${dbPath}`);

    this.db = new BetterSqlite3.default(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createSchema();
  }

  private createSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vault_entries (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        category         TEXT NOT NULL,
        tags             TEXT NOT NULL DEFAULT '[]',
        username         TEXT,
        url              TEXT,
        ciphertext       TEXT NOT NULL,
        iv               TEXT NOT NULL,
        tag              TEXT NOT NULL,
        notes_ciphertext TEXT,
        notes_iv         TEXT,
        notes_tag        TEXT,
        createdAt        TEXT NOT NULL,
        updatedAt        TEXT NOT NULL
      )
    `);
  }

  /**
   * Create a new vault entry. Encrypts the value (and notes) before storage.
   */
  create(params: CreateVaultEntryParams): VaultEntry {
    const id = randomUUID();
    const now = new Date().toISOString();
    const tags = params.tags ?? [];

    const encrypted = encrypt(params.value, this.masterKey);

    let notesCiphertext: string | null = null;
    let notesIv: string | null = null;
    let notesTag: string | null = null;

    if (params.notes) {
      const encryptedNotes = encrypt(params.notes, this.masterKey);
      notesCiphertext = encryptedNotes.ciphertext;
      notesIv = encryptedNotes.iv;
      notesTag = encryptedNotes.tag;
    }

    const stmt = this.db.prepare(`
      INSERT INTO vault_entries
        (id, name, category, tags, username, url, ciphertext, iv, tag, notes_ciphertext, notes_iv, notes_tag, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.name,
      params.category,
      JSON.stringify(tags),
      params.username ?? null,
      params.url ?? null,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.tag,
      notesCiphertext,
      notesIv,
      notesTag,
      now,
      now
    );

    logger.info(`Vault entry created: ${id} (${params.name})`);

    return {
      id,
      name: params.name,
      category: params.category,
      tags,
      username: params.username,
      url: params.url,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * List all vault entries WITHOUT decrypted values.
   */
  list(): VaultEntry[] {
    const stmt = this.db.prepare(
      'SELECT id, name, category, tags, username, url, createdAt, updatedAt FROM vault_entries ORDER BY updatedAt DESC'
    );
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      category: string;
      tags: string;
      username: string | null;
      url: string | null;
      createdAt: string;
      updatedAt: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as SecretCategory,
      tags: JSON.parse(row.tags) as string[],
      username: row.username ?? undefined,
      url: row.url ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Get a single vault entry by ID, including the decrypted value.
   */
  getById(id: string): VaultEntryWithValue | null {
    const stmt = this.db.prepare('SELECT * FROM vault_entries WHERE id = ?');
    const row = stmt.get(id) as
      | {
          id: string;
          name: string;
          category: string;
          tags: string;
          username: string | null;
          url: string | null;
          ciphertext: string;
          iv: string;
          tag: string;
          notes_ciphertext: string | null;
          notes_iv: string | null;
          notes_tag: string | null;
          createdAt: string;
          updatedAt: string;
        }
      | undefined;

    if (!row) return null;

    const value = decrypt(row.iv, row.tag, row.ciphertext, this.masterKey);

    let notes: string | undefined;
    if (row.notes_ciphertext && row.notes_iv && row.notes_tag) {
      notes = decrypt(row.notes_iv, row.notes_tag, row.notes_ciphertext, this.masterKey);
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category as SecretCategory,
      tags: JSON.parse(row.tags) as string[],
      username: row.username ?? undefined,
      url: row.url ?? undefined,
      value,
      notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Update an existing vault entry. Re-encrypts value and notes if provided.
   */
  update(id: string, changes: UpdateVaultEntryParams): VaultEntry | null {
    const existing = this.db.prepare('SELECT id FROM vault_entries WHERE id = ?').get(id) as
      | { id: string }
      | undefined;

    if (!existing) return null;

    const now = new Date().toISOString();
    const setClauses: string[] = ['updatedAt = ?'];
    const params: unknown[] = [now];

    if (changes.name !== undefined) {
      setClauses.push('name = ?');
      params.push(changes.name);
    }

    if (changes.category !== undefined) {
      setClauses.push('category = ?');
      params.push(changes.category);
    }

    if (changes.tags !== undefined) {
      setClauses.push('tags = ?');
      params.push(JSON.stringify(changes.tags));
    }

    if (changes.username !== undefined) {
      setClauses.push('username = ?');
      params.push(changes.username || null);
    }

    if (changes.url !== undefined) {
      setClauses.push('url = ?');
      params.push(changes.url || null);
    }

    if (changes.value !== undefined) {
      const encrypted = encrypt(changes.value, this.masterKey);
      setClauses.push('ciphertext = ?', 'iv = ?', 'tag = ?');
      params.push(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    }

    if (changes.notes !== undefined) {
      if (changes.notes) {
        const encryptedNotes = encrypt(changes.notes, this.masterKey);
        setClauses.push('notes_ciphertext = ?', 'notes_iv = ?', 'notes_tag = ?');
        params.push(encryptedNotes.ciphertext, encryptedNotes.iv, encryptedNotes.tag);
      } else {
        setClauses.push('notes_ciphertext = ?', 'notes_iv = ?', 'notes_tag = ?');
        params.push(null, null, null);
      }
    }

    params.push(id);

    this.db
      .prepare(`UPDATE vault_entries SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...params);

    logger.info(`Vault entry updated: ${id}`);

    // Return the updated entry without the value
    const updated = this.db
      .prepare(
        'SELECT id, name, category, tags, username, url, createdAt, updatedAt FROM vault_entries WHERE id = ?'
      )
      .get(id) as {
      id: string;
      name: string;
      category: string;
      tags: string;
      username: string | null;
      url: string | null;
      createdAt: string;
      updatedAt: string;
    };

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category as SecretCategory,
      tags: JSON.parse(updated.tags) as string[],
      username: updated.username ?? undefined,
      url: updated.url ?? undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a vault entry by ID.
   */
  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM vault_entries WHERE id = ?').run(id);
    if (result.changes > 0) {
      logger.info(`Vault entry deleted: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Search vault entries by name, tags, username, or URL.
   * Never returns decrypted values.
   */
  search(query: string): VaultEntry[] {
    const pattern = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT id, name, category, tags, username, url, createdAt, updatedAt
      FROM vault_entries
      WHERE name LIKE ? OR tags LIKE ? OR username LIKE ? OR url LIKE ?
      ORDER BY updatedAt DESC
    `);
    const rows = stmt.all(pattern, pattern, pattern, pattern) as Array<{
      id: string;
      name: string;
      category: string;
      tags: string;
      username: string | null;
      url: string | null;
      createdAt: string;
      updatedAt: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as SecretCategory,
      tags: JSON.parse(row.tags) as string[],
      username: row.username ?? undefined,
      url: row.url ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Close the database connection (for clean shutdown).
   */
  close(): void {
    this.db.close();
  }
}
