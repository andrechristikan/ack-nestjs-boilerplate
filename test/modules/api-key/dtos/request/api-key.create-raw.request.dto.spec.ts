import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyCreateRawRequestSchema } from '@modules/api-key/dtos/request/api-key.create-raw.request.dto';

describe('ApiKeyCreateRawRequestSchema', () => {
    const valid = {
        name: 'key',
        type: EnumApiKeyType.default,
        key: 'k',
        secret: 's',
    };
    it('accepts boundary credential values', () =>
        expect(ApiKeyCreateRawRequestSchema.parse(valid)).toEqual(valid));
    it.each([
        { ...valid, key: '' },
        { ...valid, secret: '' },
        { ...valid, key: 'k'.repeat(51) },
        { ...valid, secret: 's'.repeat(101) },
        { ...valid, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(ApiKeyCreateRawRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
