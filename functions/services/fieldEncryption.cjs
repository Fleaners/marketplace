/**
 * @fileoverview Field-level encryption service using AES-256-GCM.
 * Supports encrypting/decrypting sensitive Firestore fields.
 */

const crypto = require('crypto');
const secretManager = require('./secretManager.cjs');

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_PREFIX = 'enc:v1:';
const SALT = 'marketplace-field-enc-v1';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// In-memory cache for derived keys
const keyCache = new Map();

/**
 * Derives a 256-bit encryption key using scrypt.
 * Uses caching to avoid repeated expensive operations.
 *
 * @param {string} keyName - The name of the key (used for caching).
 * @returns {Promise<Buffer>} The derived key.
 */
async function getDerivedKey(keyName) {
  if (keyCache.has(keyName)) {
    return keyCache.get(keyName);
  }

  try {
    // Attempt to load from Secret Manager or environment
    let rawKey = await secretManager.getSecret(keyName);
    
    // Fallback specifically for FIELD_ENCRYPTION_KEY if keyName is 'default' and secret wasn't found
    if (!rawKey && keyName === 'default') {
      rawKey = process.env.FIELD_ENCRYPTION_KEY;
    }

    if (!rawKey) {
      throw new Error(`Encryption key '${keyName}' could not be resolved.`);
    }

    const derivedKey = crypto.scryptSync(rawKey, SALT, KEY_LENGTH);
    keyCache.set(keyName, derivedKey);
    return derivedKey;
  } catch (error) {
    console.error(`[FieldEncryption] Failed to derive key for '${keyName}': ${error.message}`);
    throw error;
  }
}

/**
 * Checks if a value is encrypted.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is an encrypted string.
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a plaintext string.
 *
 * @param {string} plaintext - The string to encrypt.
 * @param {string} [keyName='default'] - The key identifier.
 * @returns {Promise<string>} The encrypted string in format enc:v1:iv:tag:ciphertext.
 */
async function encryptField(plaintext, keyName = 'default') {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext must be a string');
  }

  try {
    const key = await getDerivedKey(keyName);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${ENCRYPTION_PREFIX}${ivHex}:${tag}:${ciphertext}`;
  } catch (error) {
    console.error(`[FieldEncryption] Error encrypting field: ${error.message}`);
    throw error;
  }
}

/**
 * Decrypts an encrypted string.
 * If the value is not encrypted, it returns the value as-is.
 *
 * @param {string} encryptedValue - The encrypted string.
 * @param {string} [keyName='default'] - The key identifier.
 * @returns {Promise<string>} The decrypted plaintext string.
 */
async function decryptField(encryptedValue, keyName = 'default') {
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }

  try {
    const key = await getDerivedKey(keyName);
    
    // Format: enc:v1:iv:tag:ciphertext
    const parts = encryptedValue.substring(ENCRYPTION_PREFIX.length).split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivHex, tagHex, ciphertextHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext, undefined, 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error(`[FieldEncryption] Error decrypting field: ${error.message}`);
    throw error;
  }
}

/**
 * Encrypts specified fields in an object in-place.
 *
 * @param {Object} obj - The object containing fields to encrypt.
 * @param {string[]} fieldNames - Array of field names to encrypt.
 * @returns {Promise<Object>} The modified object.
 */
async function encryptObject(obj, fieldNames) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  for (const field of fieldNames) {
    if (obj[field] !== undefined && typeof obj[field] === 'string' && !isEncrypted(obj[field])) {
      obj[field] = await encryptField(obj[field]);
    }
  }

  return obj;
}

/**
 * Decrypts specified fields in an object in-place.
 *
 * @param {Object} obj - The object containing fields to decrypt.
 * @param {string[]} fieldNames - Array of field names to decrypt.
 * @returns {Promise<Object>} The modified object.
 */
async function decryptObject(obj, fieldNames) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  for (const field of fieldNames) {
    if (obj[field] !== undefined && isEncrypted(obj[field])) {
      obj[field] = await decryptField(obj[field]);
    }
  }

  return obj;
}

module.exports = {
  encryptField,
  decryptField,
  isEncrypted,
  encryptObject,
  decryptObject
};
