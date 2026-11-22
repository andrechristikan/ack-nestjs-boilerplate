import { AnalyticWorkspaceSummaryCacheSchema } from '@modules/analytic/dtos/analytic.workspace-summary-cache.dto';

describe('AnalyticWorkspaceSummaryCacheSchema', () => {
    const payload = {
        memberCount: 1,
        projectCount: 2,
        activityCount: 3,
        undeclared: 'extra',
    };
    const expected = { memberCount: 1, projectCount: 2, activityCount: 3 };
    const invalid = { memberCount: 'text', projectCount: 2, activityCount: 3 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWorkspaceSummaryCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with memberCount of the wrong type', () => {
        const result = AnalyticWorkspaceSummaryCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['memberCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
