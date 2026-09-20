import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';

describe('AnalyticFraudRiskScoresRequestSchema', () => {
    const payload = { minScore: 30 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticFraudRiskScoresRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when minScore is omitted', () => {
        const result = AnalyticFraudRiskScoresRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts a zero minScore', () => {
        const result = AnalyticFraudRiskScoresRequestSchema.parse({
            minScore: 0,
        });

        expect(result).toEqual({ minScore: 0 });
    });

    it('rejects a negative minScore', () => {
        expect(() =>
            AnalyticFraudRiskScoresRequestSchema.parse({ minScore: -1 })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticFraudRiskScoresRequestSchema.parse({
                ...payload,
                userId: 'user-1',
            })
        ).toThrow();
    });
});
