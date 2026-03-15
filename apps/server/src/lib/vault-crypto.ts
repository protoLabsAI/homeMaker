/**
 * Vault Crypto — AES-256-GCM encryption/decryption for the secrets vault.
 *
 * The master key is derived from the HOMEMAKER_VAULT_KEY environment variable,
 * which must be a 64-character hex string (32 bytes = AES-256).
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

/**
 * Read and validate the master encryption key from the environment.
 * Throws immediately if the key is missing or malformed.
 */
export function getMasterKey(): Buffer {
  const hex = process.env.HOMEMAKER_VAULT_KEY;
  if (!hex) {
    throw new Error(
      'HOMEMAKER_VAULT_KEY environment variable is not set. ' +
        'The vault requires a 64-character hex key for AES-256-GCM encryption.'
    );
  }
  if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'HOMEMAKER_VAULT_KEY must be exactly 64 hex characters (32 bytes). ' +
        `Got ${hex.length} characters.`
    );
  }
  return Buffer.from(hex, 'hex');
}

/** Encrypted payload stored alongside vault metadata */
export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns hex-encoded iv, auth tag, and ciphertext.
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypt an AES-256-GCM ciphertext back to plaintext.
 * All inputs are hex-encoded strings.
 */
export function decrypt(iv: string, tag: string, ciphertext: string, key: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
