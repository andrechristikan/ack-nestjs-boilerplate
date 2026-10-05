import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyCreateResponseSchema } from '@modules/api-key/dtos/response/api-key.create.response.dto';

describe('ApiKeyCreateResponseSchema', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const row = {
        id: 'api-key-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        isActive: true,
        startAt: null,
        endAt: null,
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        secret: 'plain-secret-value',
    };

    it('parses a row into exactly the declared fields, secret included', () => {
        const result = ApiKeyCreateResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a missing secret', () => {
        const { secret: _secret, ...rest } = row;

        expect(() => ApiKeyCreateResponseSchema.parse(rest)).toThrow();
    });

    it('strips the hash out of the parsed result', () => {
        const result = ApiKeyCreateResponseSchema.parse({
            ...row,
            hash: 'hashed-secret',
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('hash');
    });
});
