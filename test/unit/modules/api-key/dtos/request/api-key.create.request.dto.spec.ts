import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyCreateRequestSchema } from '@modules/api-key/dtos/request/api-key.create.request.dto';

describe('ApiKeyCreateRequestSchema', () => {
    const startAt = new Date('2026-01-01T00:00:00.000Z');
    const endAt = new Date('2026-02-01T00:00:00.000Z');

    it('parses name, type, startAt, and endAt when endAt is at or after startAt', () => {
        const result = ApiKeyCreateRequestSchema.parse({
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

    it('parses with no date window', () => {
        const result = ApiKeyCreateRequestSchema.parse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
        });

        expect(result).toEqual({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
        });
    });

    it('rejects an endAt before startAt', () => {
        const result = ApiKeyCreateRequestSchema.safeParse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            startAt: endAt,
            endAt: startAt,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['endAt'],
                code: 'custom',
                message: 'request.error.greaterThanEqualOtherProperty.invalid',
            }),
        ]);
    });

    it.each([
        ['startAt without endAt', { startAt }, 'endAt'],
        ['endAt without startAt', { endAt }, 'startAt'],
    ])('rejects %s', (_label, window, missingPath) => {
        const result = ApiKeyCreateRequestSchema.safeParse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            ...window,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [missingPath],
                code: 'custom',
                message: 'request.error.requiredWithOtherProperty.invalid',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ApiKeyCreateRequestSchema.safeParse({
            name: 'Acme Api Key',
            type: EnumApiKeyType.default,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
