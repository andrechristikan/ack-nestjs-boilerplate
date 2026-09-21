import type { CipherGCMTypes } from 'node:crypto';

/**
 * Alphabet of `HelperStringService.random`: A-Z, a-z and 0-9.
 * @public
 */
export const HelperStringAlphanumericCharacters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Alphabet of `HelperStringService.randomUppercase`: A-Z and 0-9.
 * @public
 */
export const HelperStringUppercaseAlphanumericCharacters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Cipher of `HelperEncryptionService`: AES-256-GCM.
 * @public
 */
export const HelperEncryptionAlgorithm: CipherGCMTypes = 'aes-256-gcm';

/**
 * Digest HKDF uses to derive the per-purpose encryption key.
 * @public
 */
export const HelperEncryptionKeyDigest = 'sha256';

/**
 * Length of the derived AES-256 key.
 * @public
 */
export const HelperEncryptionKeyLengthInBytes = 32;

/**
 * Length of the raw root secret `HelperEncryptionService` accepts as HKDF key material.
 * @public
 */
export const HelperEncryptionSecretLengthInBytes = 48;

/**
 * Length of the random HKDF salt drawn for every encryption.
 * @public
 */
export const HelperEncryptionSaltLengthInBytes = 16;

/**
 * Length of the random IV drawn for every encryption.
 * @public
 */
export const HelperEncryptionIvLengthInBytes = 12;

/**
 * Length of the GCM authentication tag.
 * @public
 */
export const HelperEncryptionAuthTagLengthInBytes = 16;

/**
 * Separator between the base64url salt, IV, ciphertext and tag parts of an encrypted payload.
 * @public
 */
export const HelperEncryptionPayloadSeparator = '.';

/**
 * Matches one `{token}` placeholder of a pattern string, capturing the token name.
 * @public
 */
export const HelperStringPatternTokenRegex = /\{(\w+)\}/g;
