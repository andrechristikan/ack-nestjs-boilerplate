import { AnalyticWorkspacesMembershipListRequestSchema } from '@modules/analytic/dtos/request/analytic-workspaces-membership-list.request.dto';

describe('AnalyticWorkspacesMembershipListRequestSchema', () => {
    it('parses page and perPage', () => {
        const result = AnalyticWorkspacesMembershipListRequestSchema.parse({
            page: 1,
            perPage: 20,
        });

        expect(result).toEqual({ page: 1, perPage: 20 });
    });

    it('parses an empty object', () => {
        const result = AnalyticWorkspacesMembershipListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AnalyticWorkspacesMembershipListRequestSchema.parse({
                page: 1,
                extra: true,
            })
        ).toThrow();
    });
});
