import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';

describe('ApiKeyCreateResponseSchema', () => {
    it('exposes the plain secret once and strips the stored hash', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const result = ApiKeyCreateResponseSchema.parse({
            id: 'id',
            type: EnumApiKeyType.default,
            name: 'key',
            key: 'public',
            isActive: true,
            startAt: null,
            endAt: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            secret: 'secret',
            hash: 'hash',
        });
        expect(result.secret).toBe('secret');
        expect(result).not.toHaveProperty('hash');
    });
});
