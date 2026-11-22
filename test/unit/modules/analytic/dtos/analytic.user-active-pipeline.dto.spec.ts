import { AnalyticUserActivePipelineSchema } from '@modules/analytic/dtos/analytic.user-active-pipeline.dto';

describe('AnalyticUserActivePipelineSchema', () => {
    const payload = [{ daily: 1, weekly: 2, monthly: 3, undeclared: 'extra' }];
    const expected = [{ daily: 1, weekly: 2, monthly: 3 }];
    const invalid = [{ daily: 'text', weekly: 2, monthly: 3 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticUserActivePipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.daily of the wrong type', () => {
        const result = AnalyticUserActivePipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'daily'],
                code: 'invalid_type',
            }),
        ]);
    });
});
