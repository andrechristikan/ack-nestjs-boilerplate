import { AnalyticUserBlockedPipelineSchema } from '@modules/analytic/dtos/analytic.user-blocked-pipeline.dto';

describe('AnalyticUserBlockedPipelineSchema', () => {
    const payload = [{ trend: 1, current: 2, undeclared: 'extra' }];
    const expected = [{ trend: 1, current: 2 }];
    const invalid = [{ trend: 'text', current: 2 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticUserBlockedPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.trend of the wrong type', () => {
        const result = AnalyticUserBlockedPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'trend'],
                code: 'invalid_type',
            }),
        ]);
    });
});
