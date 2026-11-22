import { AnalyticAuthConcurrentSessionsPipelineSchema } from '@modules/analytic/dtos/analytic.auth-concurrent-sessions-pipeline.dto';

describe('AnalyticAuthConcurrentSessionsPipelineSchema', () => {
    const payload = [{ _id: 1, count: 2, undeclared: 'extra' }];
    const expected = [{ _id: 1, count: 2 }];
    const invalid = [{ _id: 1, count: 'text' }];

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticAuthConcurrentSessionsPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.count of the wrong type', () => {
        const result =
            AnalyticAuthConcurrentSessionsPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'count'],
                code: 'invalid_type',
            }),
        ]);
    });
});
