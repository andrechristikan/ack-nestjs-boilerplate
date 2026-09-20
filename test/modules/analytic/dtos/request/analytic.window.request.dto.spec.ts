import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

describe('AnalyticWindowRequestSchema', () => {
    const payload = { windowMs: 600000 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWindowRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when windowMs is omitted', () => {
        const result = AnalyticWindowRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string into an integer', () => {
        const result = AnalyticWindowRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a non-positive windowMs', () => {
        expect(() =>
            AnalyticWindowRequestSchema.parse({ windowMs: 0 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticWindowRequestSchema.parse({
                ...payload,
                startDate: new Date('2026-01-01T00:00:00.000Z'),
            })
        ).toThrow();
    });
});
