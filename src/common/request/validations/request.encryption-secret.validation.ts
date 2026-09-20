import { z } from 'zod';

/**
 * Encryption secret: exactly 64 base64url characters.
 * @public
 */
export const RequestEncryptionSecretSchema = z
    .string()
    .regex(/^[A-Za-z0-9_-]{64}$/)
    .meta({
        description: 'Encryption secret of exactly 64 base64url characters',
        example: 'A'.repeat(64),
    });
