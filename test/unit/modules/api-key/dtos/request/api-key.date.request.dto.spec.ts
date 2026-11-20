import { ApiKeyDateRequestSchema } from '@modules/api-key/dtos/request/api-key.date.request.dto';

describe('ApiKeyDateRequestSchema', () => {
    const startAt = new Date('2026-01-01T00:00:00.000Z');
    const endAt = new Date('2026-02-01T00:00:00.000Z');

    it('parses startAt and endAt into exactly the declared fields', () => {
        const result = ApiKeyDateRequestSchema.parse({ startAt, endAt });

        expect(result).toEqual({ startAt, endAt });
    });

    it('coerces a date string', () => {
        const result = ApiKeyDateRequestSchema.parse({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
        });

        expect(result).toEqual({ startAt, endAt });
    });

    it('rejects a missing startAt', () => {
        const result = ApiKeyDateRequestSchema.safeParse({ endAt });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['startAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a missing endAt', () => {
        const result = ApiKeyDateRequestSchema.safeParse({ startAt });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['endAt'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ApiKeyDateRequestSchema.safeParse({
            startAt,
            endAt,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
