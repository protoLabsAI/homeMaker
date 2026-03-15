/**
 * Vault types — encrypted local secrets storage for homeMaker.
 *
 * VaultEntry is the "safe" shape returned by list() — no value field.
 * VaultEntryWithValue includes the decrypted plaintext, only returned by getById().
 */

/** Supported secret categories for organization and filtering */
export type SecretCategory = 'password' | 'api-key' | 'wifi' | 'code' | 'note' | 'other';

/** Metadata-only vault entry — never contains the secret value */
export interface VaultEntry {
  id: string;
  name: string;
  category: SecretCategory;
  tags: string[];
  username?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

/** Full vault entry with decrypted value — only returned for single-item reads */
export interface VaultEntryWithValue extends VaultEntry {
  value: string;
  notes?: string;
}
