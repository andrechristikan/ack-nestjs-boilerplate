import { AnalyticLoginTimeAnomalyAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticLoginTimeAnomalyListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-time-anomaly-list.request.dto';

describe('AnalyticLoginTimeAnomalyListRequestSchema', () => {
    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    it('parses page, perPage, orderBy, and the date range', () => {
        const result = AnalyticLoginTimeAnomalyListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:desc`,
            startDate,
            endDate,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:desc`,
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

    it('rejects search', () => {
        expect(
            AnalyticLoginTimeAnomalyListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticLoginTimeAnomalyListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticLoginTimeAnomalyAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticLoginTimeAnomalyAvailableOrderBy[0];
        const last =
            AnalyticLoginTimeAnomalyAvailableOrderBy[
                AnalyticLoginTimeAnomalyAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticLoginTimeAnomalyListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticLoginTimeAnomalyListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:`,
        `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:DESC`,
        `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticLoginTimeAnomalyListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
