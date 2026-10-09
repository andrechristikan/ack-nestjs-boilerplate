import { AnalyticLoginSpikeIpAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticLoginSpikeIpListRequestSchema } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';

describe('AnalyticLoginSpikeIpListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticLoginSpikeIpListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticLoginSpikeIpListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticLoginSpikeIpAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticLoginSpikeIpAvailableOrderBy[0];
        const last =
            AnalyticLoginSpikeIpAvailableOrderBy[
                AnalyticLoginSpikeIpAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:`,
        `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:DESC`,
        `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticLoginSpikeIpListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
