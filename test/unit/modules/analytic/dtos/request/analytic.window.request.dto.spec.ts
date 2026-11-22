import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

describe('AnalyticWindowRequestSchema', () => {
    it('parses an empty object', () => {
        expect(AnalyticWindowRequestSchema.parse({})).toEqual({});
    });

    it('coerces a numeric string', () => {
        expect(
            AnalyticWindowRequestSchema.parse({ windowMs: '600000' })
        ).toEqual({
            windowMs: 600000,
        });
    });

    it('rejects zero', () => {
        expect(() =>
            AnalyticWindowRequestSchema.parse({ windowMs: 0 })
        ).toThrow();
    });

    it('rejects a negative value', () => {
        expect(() =>
            AnalyticWindowRequestSchema.parse({ windowMs: -1 })
        ).toThrow();
    });

    it('rejects a non-integer', () => {
        expect(() =>
            AnalyticWindowRequestSchema.parse({ windowMs: 1.5 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() => AnalyticWindowRequestSchema.parse({ extra: 1 })).toThrow();
    });
});
