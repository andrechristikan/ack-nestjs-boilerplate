import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic-fraud-risk-scores-list.request.dto';

describe('AnalyticFraudRiskScoresListRequestSchema', () => {
    it('parses page, perPage, orderBy, and minScore', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'score:desc',
            minScore: 30,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'score:desc',
            minScore: 30,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts a zero minScore', () => {
        const result = AnalyticFraudRiskScoresListRequestSchema.parse({
            minScore: 0,
        });

        expect(result).toEqual({ minScore: 0 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticFraudRiskScoresListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
