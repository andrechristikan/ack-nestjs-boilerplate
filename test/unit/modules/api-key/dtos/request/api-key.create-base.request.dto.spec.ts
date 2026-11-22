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
        const result = ApiKeyCreateBaseRequestSchema.safeParse({
            name: '',
            type: EnumApiKeyType.default,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects a name over 100 characters', () => {
        const result = ApiKeyCreateBaseRequestSchema.safeParse({
            name: 'a'.repeat(101),
            type: EnumApiKeyType.default,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_big' }),
        ]);
    });

    it('rejects an invalid type', () => {
        const result = ApiKeyCreateBaseRequestSchema.safeParse({
            name: 'Acme Api Key',
            type: 'invalid',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ApiKeyCreateBaseRequestSchema.safeParse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('trims the name and rejects a whitespace-only name', () => {
        expect(
            ApiKeyCreateBaseRequestSchema.parse({
                name: '  Acme  ',
                type: EnumApiKeyType.default,
            }).name
        ).toBe('Acme');
        expect(
            ApiKeyCreateBaseRequestSchema.safeParse({
                name: '   ',
                type: EnumApiKeyType.default,
            }).error?.issues
        ).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });
});
