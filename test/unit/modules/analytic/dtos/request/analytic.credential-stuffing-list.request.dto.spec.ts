import { AnalyticCredentialStuffingAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticCredentialStuffingListRequestSchema } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';

describe('AnalyticCredentialStuffingListRequestSchema', () => {
    it('parses page, perPage, orderBy, and windowMs', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticCredentialStuffingAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: `${AnalyticCredentialStuffingAvailableOrderBy[0]}:desc`,
            windowMs: 3600000,
        });
    });

    it('parses an empty object', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string windowMs into an integer', () => {
        const result = AnalyticCredentialStuffingListRequestSchema.parse({
            windowMs: '600000',
        });

        expect(result).toEqual({ windowMs: 600000 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticCredentialStuffingListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                search: 'x',
            }).success
        ).toBe(false);
    });

    it('keeps the module orderBy description', () => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(AnalyticCredentialStuffingAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = AnalyticCredentialStuffingAvailableOrderBy[0];
        const last =
            AnalyticCredentialStuffingAvailableOrderBy[
                AnalyticCredentialStuffingAvailableOrderBy.length - 1
            ];

        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${AnalyticCredentialStuffingAvailableOrderBy[0]}:`,
        `${AnalyticCredentialStuffingAvailableOrderBy[0]}:DESC`,
        `${AnalyticCredentialStuffingAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            AnalyticCredentialStuffingListRequestSchema.safeParse({ orderBy })
                .success
        ).toBe(false);
    });
});
