import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';

describe('HealthIndicatorResultSchema', () => {
    it('parses an indicator map into exactly the declared entries', () => {
        const payload = { database: { status: 'up' } };

        const result = HealthIndicatorResultSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty map', () => {
        const result = HealthIndicatorResultSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an entry whose value is not a record', () => {
        const result = HealthIndicatorResultSchema.safeParse({
            database: 'up',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['database'],
                code: 'invalid_type',
            }),
        ]);
    });
});
