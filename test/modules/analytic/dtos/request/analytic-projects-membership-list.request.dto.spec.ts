import { AnalyticProjectsMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic-projects-membership-list.request.dto';

describe('AnalyticProjectsMembershipListRequestSchema', () => {
    it('parses page and perPage', () => {
        const result = AnalyticProjectsMembershipListRequestSchema.parse({
            page: 1,
            perPage: 20,
        });

        expect(result).toEqual({ page: 1, perPage: 20 });
    });

    it('parses an empty object', () => {
        const result = AnalyticProjectsMembershipListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticProjectsMembershipListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
