import { AnalyticWorkspaceSummaryPipelineSchema } from '@modules/analytic/dtos/analytic.workspace-summary-pipeline.dto';

describe('AnalyticWorkspaceSummaryPipelineSchema', () => {
    const payload = [
        {
            memberCount: 1,
            projectCount: 2,
            activityCount: 3,
            undeclared: 'extra',
        },
    ];
    const expected = [{ memberCount: 1, projectCount: 2, activityCount: 3 }];
    const invalid = [
        { memberCount: 'text', projectCount: 2, activityCount: 3 },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWorkspaceSummaryPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.memberCount of the wrong type', () => {
        const result =
            AnalyticWorkspaceSummaryPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'memberCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
