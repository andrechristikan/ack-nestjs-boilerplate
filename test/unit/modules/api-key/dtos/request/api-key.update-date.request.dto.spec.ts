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
        const result = ApiKeyUpdateDateRequestSchema.safeParse({
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

    it('parses both dates null', () => {
        const result = ApiKeyUpdateDateRequestSchema.parse({
            startAt: null,
            endAt: null,
        });

        expect(result).toEqual({ startAt: null, endAt: null });
    });

    it('reports an issue at endAt when only startAt is null', () => {
        const result = ApiKeyUpdateDateRequestSchema.safeParse({
            startAt: null,
            endAt,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['endAt'],
                code: 'custom',
                message: 'request.error.requiredWithOtherProperty.invalid',
            }),
        ]);
    });

    it('reports an issue at endAt when only endAt is null', () => {
        const result = ApiKeyUpdateDateRequestSchema.safeParse({
            startAt,
            endAt: null,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['endAt'],
                code: 'custom',
                message: 'request.error.requiredWithOtherProperty.invalid',
            }),
        ]);
    });

    it('reports an issue at endAt when endAt is before startAt', () => {
        const result = ApiKeyUpdateDateRequestSchema.safeParse({
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

    it('rejects a missing startAt', () => {
        const result = ApiKeyUpdateDateRequestSchema.safeParse({ endAt });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['startAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ApiKeyUpdateDateRequestSchema.safeParse({
            startAt,
            endAt,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
