import { EnumApiKeyType } from '@generated/prisma-client';
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
});
