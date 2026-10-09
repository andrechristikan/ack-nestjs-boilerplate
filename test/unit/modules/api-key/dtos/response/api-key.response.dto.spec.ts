import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyResponseSchema } from '@modules/api-key/dtos/response/api-key.response.dto';

describe('ApiKeyResponseSchema', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const startAt = new Date('2026-01-03T00:00:00.000Z');
    const endAt = new Date('2026-02-01T00:00:00.000Z');
    const row = {
        id: 'api-key-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        isActive: true,
        startAt,
        endAt,
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = ApiKeyResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses null startAt and endAt', () => {
        const result = ApiKeyResponseSchema.parse({
            ...row,
            startAt: null,
            endAt: null,
        });

        expect(result).toEqual({ ...row, startAt: null, endAt: null });
    });

    it('strips deletedAt, deletedBy, and any other undeclared key', () => {
        const result = ApiKeyResponseSchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
            hash: 'secret-hash',
        });

        expect(result).toEqual(row);
    });
});
