import { AnalyticFraudCountPipelineSchema } from '@modules/analytic/dtos/analytic.fraud-count-pipeline.dto';

describe('AnalyticFraudCountPipelineSchema', () => {
    const payload = [{ n: 1, undeclared: 'extra' }];
    const expected = [{ n: 1 }];
    const invalid = [{ n: 'text' }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticFraudCountPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.n of the wrong type', () => {
        const result = AnalyticFraudCountPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'n'],
                code: 'invalid_type',
            }),
        ]);
    });
});
