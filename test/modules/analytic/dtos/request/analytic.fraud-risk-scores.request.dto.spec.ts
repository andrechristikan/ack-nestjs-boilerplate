import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';

describe('AnalyticFraudRiskScoresRequestSchema', () => {
    it('parses an empty object', () => {
        expect(AnalyticFraudRiskScoresRequestSchema.parse({})).toEqual({});
    });

    it('coerces minScore from a string', () => {
        expect(
            AnalyticFraudRiskScoresRequestSchema.parse({ minScore: '30' })
        ).toEqual({ minScore: 30 });
    });

    it('accepts zero', () => {
        expect(
            AnalyticFraudRiskScoresRequestSchema.parse({ minScore: 0 })
        ).toEqual({ minScore: 0 });
    });

    it('rejects a negative minScore', () => {
        expect(() =>
            AnalyticFraudRiskScoresRequestSchema.parse({ minScore: -1 })
        ).toThrow();
    });

    it('rejects a non-integer minScore', () => {
        expect(() =>
            AnalyticFraudRiskScoresRequestSchema.parse({ minScore: 1.5 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticFraudRiskScoresRequestSchema.parse({ extra: 1 })
        ).toThrow();
    });
});
