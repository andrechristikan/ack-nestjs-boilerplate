import type { CipherGCMTypes } from 'node:crypto';

/** @public */
export const HelperStringAlphanumericCharacters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** @public */
export const HelperStringUppercaseAlphanumericCharacters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** @public */
export const HelperEncryptionAlgorithm: CipherGCMTypes = 'aes-256-gcm';

/** @public */
export const HelperEncryptionKeyDigest = 'sha256';

/** @public */
export const HelperEncryptionKeyLengthInBytes = 32;

/** @public */
export const HelperEncryptionSecretLengthInBytes = 48;

/** @public */
export const HelperEncryptionSaltLengthInBytes = 16;

/** @public */
export const HelperEncryptionIvLengthInBytes = 12;

/** @public */
export const HelperEncryptionAuthTagLengthInBytes = 16;

/** @public */
export const HelperEncryptionPayloadSeparator = '.';

/** @public */
export const HelperStringPatternTokenRegex = /\{(\w+)\}/g;
