import { RequestEncryptionSecretRegex } from '@common/request/constants/request.constant';
import { z } from 'zod';

/** @public */
export const RequestEncryptionSecretSchema = z
    .string()
    .length(64)
    .regex(RequestEncryptionSecretRegex)
    .meta({
        description: 'Encryption secret of exactly 64 base64url characters',
        example: 'A'.repeat(64),
    });
