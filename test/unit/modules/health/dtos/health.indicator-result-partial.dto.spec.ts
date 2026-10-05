import { HealthIndicatorResultPartialSchema } from '@modules/health/dtos/health.indicator-result-partial.dto';

describe('HealthIndicatorResultPartialSchema', () => {
    it('parses an indicator map into exactly the declared entries', () => {
        const payload = { database: { status: 'up' } };

        const result = HealthIndicatorResultPartialSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty map', () => {
        const result = HealthIndicatorResultPartialSchema.parse({});

        expect(result).toEqual({});
    });

    it('parses an entry whose value is undefined', () => {
        const payload = { database: undefined };

        const result = HealthIndicatorResultPartialSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an entry whose value is not a record', () => {
        expect(() =>
            HealthIndicatorResultPartialSchema.parse({ database: 'up' })
        ).toThrow();
    });
});
