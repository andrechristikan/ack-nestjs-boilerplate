import { AnalyticLoginTimeAnomalyListRequestSchema } from '@modules/analytic/dtos/request/analytic-login-time-anomaly-list.request.dto';

describe('AnalyticLoginTimeAnomalyListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticLoginTimeAnomalyListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
            startDate,
            endDate,
        });
    });

    it('parses an empty object when dates are omitted', () => {
        const result = AnalyticLoginTimeAnomalyListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces ISO strings into Date values', () => {
        const result = AnalyticLoginTimeAnomalyListRequestSchema.parse({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });

        expect(result).toEqual({ startDate, endDate });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticLoginTimeAnomalyListRequestSchema.parse({
                startDate,
                endDate,
                extra: true,
            })
        ).toThrow();
    });
});
