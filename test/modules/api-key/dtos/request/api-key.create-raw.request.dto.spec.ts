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

        expect(() => ApiKeyCreateRawRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a missing secret', () => {
        const { secret: _secret, ...rest } = payload;

        expect(() => ApiKeyCreateRawRequestSchema.parse(rest)).toThrow();
    });

    it('rejects a key over 50 characters', () => {
        expect(() =>
            ApiKeyCreateRawRequestSchema.parse({
                ...payload,
                key: 'a'.repeat(51),
            })
        ).toThrow();
    });

    it('rejects a secret over 100 characters', () => {
        expect(() =>
            ApiKeyCreateRawRequestSchema.parse({
                ...payload,
                secret: 'a'.repeat(101),
            })
        ).toThrow();
    });

    it('rejects a startAt key inherited from the base date schema', () => {
        expect(() =>
            ApiKeyCreateRawRequestSchema.parse({
                ...payload,
                startAt: new Date(),
            })
        ).toThrow();
    });
});
