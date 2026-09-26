import { ApiKeyUpdateRequestSchema } from '@modules/api-key/dtos/request/api-key.update.request.dto';

describe('ApiKeyUpdateRequestSchema', () => {
    it('accepts boundary names', () =>
        expect(
            ApiKeyUpdateRequestSchema.safeParse({ name: 'a'.repeat(100) })
                .success
        ).toBe(true));
    it.each([
        { name: '' },
        { name: 'a'.repeat(101) },
        { name: 'key', unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(ApiKeyUpdateRequestSchema.safeParse(input).success).toBe(false)
    );
});
