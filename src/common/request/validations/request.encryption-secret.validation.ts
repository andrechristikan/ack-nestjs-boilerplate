import { z } from 'zod';

/** @public */
export const RequestEncryptionSecretSchema = z
    .string()
    .length(64)
    .regex(/^[A-Za-z0-9_-]+$/)
    .meta({
        description: 'Encryption secret of exactly 64 base64url characters',
        example: 'A'.repeat(64),
    });
