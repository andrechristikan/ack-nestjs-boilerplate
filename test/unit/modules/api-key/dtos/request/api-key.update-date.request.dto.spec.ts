import { ApiKeyUpdateDateRequestSchema } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';

describe('ApiKeyUpdateDateRequestSchema', () => {
    const startAt = new Date('2026-01-01T00:00:00.000Z');
    const endAt = new Date('2026-02-01T00:00:00.000Z');

    it('parses startAt and endAt when endAt is at or after startAt', () => {
        const result = ApiKeyUpdateDateRequestSchema.parse({ startAt, endAt });

        expect(result).toEqual({ startAt, endAt });
    });

    it('parses an equal startAt and endAt', () => {
        const result = ApiKeyUpdateDateRequestSchema.parse({
            startAt,
            endAt: startAt,
        });

        expect(result).toEqual({ startAt, endAt: startAt });
    });

    it('rejects an endAt before startAt', () => {
        expect(() =>
            ApiKeyUpdateDateRequestSchema.parse({
                startAt: endAt,
                endAt: startAt,
            })
        ).toThrow();
    });

    it('rejects a missing startAt', () => {
        expect(() => ApiKeyUpdateDateRequestSchema.parse({ endAt })).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ApiKeyUpdateDateRequestSchema.parse({
                startAt,
                endAt,
                extra: true,
            })
        ).toThrow();
    });
});
