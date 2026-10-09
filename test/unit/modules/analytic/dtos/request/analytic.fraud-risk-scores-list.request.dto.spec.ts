import { AnalyticFraudRiskScoreAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticFraudRiskScoresListRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';

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

    it('rejects search', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticFraudRiskScoreAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticFraudRiskScoreAvailableOrderBy[0];
        const last =
            AnalyticFraudRiskScoreAvailableOrderBy[
                AnalyticFraudRiskScoreAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticFraudRiskScoreAvailableOrderBy[0]}:`,
        `${AnalyticFraudRiskScoreAvailableOrderBy[0]}:DESC`,
        `${AnalyticFraudRiskScoreAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticFraudRiskScoresListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
