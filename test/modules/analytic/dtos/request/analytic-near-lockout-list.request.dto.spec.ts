import { AnalyticNearLockoutListRequestSchema } from '@modules/analytic/dtos/request/analytic-near-lockout-list.request.dto';

describe('AnalyticNearLockoutListRequestSchema', () => {
    it('parses page, perPage, and orderBy', () => {
        const result = AnalyticNearLockoutListRequestSchema.parse({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });

        expect(result).toEqual({
            page: 1,
            perPage: 20,
            orderBy: 'createdAt:desc',
        });
    });

    it('parses an orderBy array', () => {
        const result = AnalyticNearLockoutListRequestSchema.parse({
            orderBy: ['createdAt:desc', 'id:asc'],
        });

        expect(result).toEqual({ orderBy: ['createdAt:desc', 'id:asc'] });
    });

    it('parses an empty object', () => {
        const result = AnalyticNearLockoutListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticNearLockoutListRequestSchema.parse({ page: 1, extra: true })
        ).toThrow();
    });
});
