import { AnalyticWorkspaceSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';

describe('AnalyticWorkspaceSummaryResponseSchema', () => {
    const row = { memberCount: 3, projectCount: 2, activityCount: 9 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticWorkspaceSummaryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticWorkspaceSummaryResponseSchema.parse({
            ...row,
            ownerId: 'user-1',
        });

        expect(result).toEqual(row);
    });
});
