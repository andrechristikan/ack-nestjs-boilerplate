import { ApiKeyDateRequestSchema } from '@modules/api-key/dtos/request/api-key.date.request.dto';

describe('ApiKeyDateRequestSchema', () => {
    const valid = { startAt: '2026-01-01', endAt: '2026-02-01' };
    it('coerces valid dates', () =>
        expect(ApiKeyDateRequestSchema.parse(valid)).toEqual({
            startAt: new Date('2026-01-01'),
            endAt: new Date('2026-02-01'),
        }));
    it.each([
        { ...valid, startAt: 'invalid' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(ApiKeyDateRequestSchema.safeParse(input).success).toBe(false)
    );
});
