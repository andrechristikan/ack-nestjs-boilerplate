import { AnalyticDeviceProliferationPipelineSchema } from '@modules/analytic/dtos/analytic.device-proliferation-pipeline.dto';

describe('AnalyticDeviceProliferationPipelineSchema', () => {
    const payload = [
        {
            stats: [{ avg: 1, stdDev: 2 }],
            rows: [{ _id: { $oid: '$oid-1' }, deviceCount: 3, zScore: 4 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            stats: [{ avg: 1, stdDev: 2 }],
            rows: [{ _id: '$oid-1', deviceCount: 3, zScore: 4 }],
        },
    ];
    const invalid = [
        {
            stats: [{ avg: 'text', stdDev: 2 }],
            rows: [{ _id: { $oid: '$oid-1' }, deviceCount: 3, zScore: 4 }],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticDeviceProliferationPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.stats.0.avg of the wrong type', () => {
        const result =
            AnalyticDeviceProliferationPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'stats', 0, 'avg'],
                code: 'invalid_type',
            }),
        ]);
    });
});
