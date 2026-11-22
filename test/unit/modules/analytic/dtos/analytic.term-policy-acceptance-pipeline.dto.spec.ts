import { AnalyticTermPolicyAcceptancePipelineSchema } from '@modules/analytic/dtos/analytic.term-policy-acceptance-pipeline.dto';

describe('AnalyticTermPolicyAcceptancePipelineSchema', () => {
    const payload = [
        { published: 1, acceptances: 2, users: 3, undeclared: 'extra' },
    ];
    const expected = [{ published: 1, acceptances: 2, users: 3 }];
    const invalid = [{ published: 'text', acceptances: 2, users: 3 }];

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticTermPolicyAcceptancePipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.published of the wrong type', () => {
        const result =
            AnalyticTermPolicyAcceptancePipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'published'],
                code: 'invalid_type',
            }),
        ]);
    });
});
