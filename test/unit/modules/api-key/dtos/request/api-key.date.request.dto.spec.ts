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
        expect(() => ApiKeyDateRequestSchema.parse({ endAt })).toThrow();
    });

    it('rejects a missing endAt', () => {
        expect(() => ApiKeyDateRequestSchema.parse({ startAt })).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ApiKeyDateRequestSchema.parse({ startAt, endAt, extra: true })
        ).toThrow();
    });
});
