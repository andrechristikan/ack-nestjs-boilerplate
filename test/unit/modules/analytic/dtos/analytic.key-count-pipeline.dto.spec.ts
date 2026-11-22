import { AnalyticKeyCountPipelineSchema } from '@modules/analytic/dtos/analytic.key-count-pipeline.dto';

describe('AnalyticKeyCountPipelineSchema', () => {
    const payload = [
        {
            data: [{ key: 'key-1', count: 1 }],
            total: [{ n: 2 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        { data: [{ key: 'key-1', count: 1 }], total: [{ n: 2 }] },
    ];
    const invalid = [{ data: [{ key: 123, count: 1 }], total: [{ n: 2 }] }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticKeyCountPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.data.0.key of the wrong type', () => {
        const result = AnalyticKeyCountPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 0, 'key'],
                code: 'invalid_type',
            }),
        ]);
    });
});
