import { AnalyticCredentialStuffingPipelineSchema } from '@modules/analytic/dtos/analytic.credential-stuffing-pipeline.dto';

describe('AnalyticCredentialStuffingPipelineSchema', () => {
    const payload = [
        {
            data: [{ ipAddress: 'ipAddress-1', uniqueUsers: 1, failCount: 2 }],
            total: [{ n: 3 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            data: [{ ipAddress: 'ipAddress-1', uniqueUsers: 1, failCount: 2 }],
            total: [{ n: 3 }],
        },
    ];
    const invalid = [
        {
            data: [{ ipAddress: 123, uniqueUsers: 1, failCount: 2 }],
            total: [{ n: 3 }],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticCredentialStuffingPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.data.0.ipAddress of the wrong type', () => {
        const result =
            AnalyticCredentialStuffingPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 0, 'ipAddress'],
                code: 'invalid_type',
            }),
        ]);
    });
});
