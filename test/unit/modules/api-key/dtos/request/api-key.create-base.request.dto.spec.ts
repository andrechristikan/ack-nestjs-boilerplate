import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

describe('ApiKeyCreateBaseRequestSchema', () => {
    const startAt = new Date('2026-01-01T00:00:00.000Z');
    const endAt = new Date('2026-02-01T00:00:00.000Z');

    it('parses name, type, startAt, and endAt into exactly the declared fields', () => {
        const result = ApiKeyCreateBaseRequestSchema.parse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            startAt,
            endAt,
        });

        expect(result).toEqual({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            startAt,
            endAt,
        });
    });

    it('parses with only the required name and type', () => {
        const result = ApiKeyCreateBaseRequestSchema.parse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.system,
        });

        expect(result).toEqual({
            name: 'Acme Api Key',
            type: EnumApiKeyType.system,
        });
    });

    it('rejects an empty name', () => {
        expect(() =>
            ApiKeyCreateBaseRequestSchema.parse({
                name: '',
                type: EnumApiKeyType.default,
            })
        ).toThrow();
    });

    it('rejects a name over 100 characters', () => {
        expect(() =>
            ApiKeyCreateBaseRequestSchema.parse({
                name: 'a'.repeat(101),
                type: EnumApiKeyType.default,
            })
        ).toThrow();
    });

    it('rejects an invalid type', () => {
        expect(() =>
            ApiKeyCreateBaseRequestSchema.parse({
                name: 'Acme Api Key',
                type: 'invalid',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ApiKeyCreateBaseRequestSchema.parse({
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
                extra: true,
            })
        ).toThrow();
    });
});
