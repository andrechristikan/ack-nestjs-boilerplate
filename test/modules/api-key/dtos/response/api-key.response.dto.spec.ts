import { describe, expect, it } from 'vitest';

import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyResponseSchema } from '@modules/api-key/dtos/response/api-key.response.dto';

describe('API key response schemas', () => {
    const apiKey = {
        id: 'api-key-id',
        type: EnumApiKeyType.default,
        name: 'Public API',
        key: 'production_public-key',
        hash: 'stored-hash',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        secret: 'one-time-secret',
    };

    it('never serializes the stored credential hash', () => {
        expect(ApiKeyResponseSchema.parse(apiKey)).not.toHaveProperty('hash');
        expect(ApiKeyResponseSchema.parse(apiKey)).not.toHaveProperty('secret');
    });

    it('exposes the plain secret only through the create/reset response', () => {
        const serialized = ApiKeyCreateResponseSchema.parse(apiKey);

        expect(serialized.secret).toBe('one-time-secret');
        expect(serialized).not.toHaveProperty('hash');
    });
});
