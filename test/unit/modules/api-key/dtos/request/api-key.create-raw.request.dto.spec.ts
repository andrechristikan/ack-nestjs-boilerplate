import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyCreateRawRequestSchema } from '@modules/api-key/dtos/request/api-key.create-raw.request.dto';

describe('ApiKeyCreateRawRequestSchema', () => {
    const payload = {
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        secret: 'secret-value',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ApiKeyCreateRawRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a missing key', () => {
        const { key: _key, ...rest } = payload;

        const result = ApiKeyCreateRawRequestSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a missing secret', () => {
        const { secret: _secret, ...rest } = payload;

        const result = ApiKeyCreateRawRequestSchema.safeParse(rest);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['secret'], code: 'invalid_type' }),
        ]);
    });

    it('rejects a key over 50 characters', () => {
        const result = ApiKeyCreateRawRequestSchema.safeParse({
            ...payload,
            key: 'a'.repeat(51),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'too_big' }),
        ]);
    });

    it('rejects a secret over 100 characters', () => {
        const result = ApiKeyCreateRawRequestSchema.safeParse({
            ...payload,
            secret: 'a'.repeat(101),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['secret'], code: 'too_big' }),
        ]);
    });

    it('rejects a startAt key inherited from the base date schema', () => {
        const result = ApiKeyCreateRawRequestSchema.safeParse({
            ...payload,
            startAt: new Date('2026-01-01T00:00:00.000Z'),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
