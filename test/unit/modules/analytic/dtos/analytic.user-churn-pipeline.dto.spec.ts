import { AnalyticUserChurnPipelineSchema } from '@modules/analytic/dtos/analytic.user-churn-pipeline.dto';

describe('AnalyticUserChurnPipelineSchema', () => {
    const payload = [{ total: 1, deleted: 2, undeclared: 'extra' }];
    const expected = [{ total: 1, deleted: 2 }];
    const invalid = [{ total: 'text', deleted: 2 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticUserChurnPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.total of the wrong type', () => {
        const result = AnalyticUserChurnPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'total'],
                code: 'invalid_type',
            }),
        ]);
    });
});
