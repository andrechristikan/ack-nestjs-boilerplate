import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

describe('ApiKeyCreateBaseRequestSchema', () => {
    it('accepts boundary names and optional dates', () => {
        expect(
            ApiKeyCreateBaseRequestSchema.parse({
                name: 'a',
                type: EnumApiKeyType.default,
            })
        ).toEqual({ name: 'a', type: EnumApiKeyType.default });
        expect(
            ApiKeyCreateBaseRequestSchema.safeParse({
                name: 'a'.repeat(100),
                type: EnumApiKeyType.system,
            }).success
        ).toBe(true);
    });
    it.each([
        { name: '', type: EnumApiKeyType.default },
        { name: 'a'.repeat(101), type: EnumApiKeyType.default },
        { name: 'key', type: 'invalid' },
        { name: 'key', type: EnumApiKeyType.default, unknown: true },
    ])('rejects invalid input', input =>
        expect(ApiKeyCreateBaseRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
