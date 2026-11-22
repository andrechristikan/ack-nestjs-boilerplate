import { AnalyticAccountTakeoverPipelineSchema } from '@modules/analytic/dtos/analytic.account-takeover-pipeline.dto';

describe('AnalyticAccountTakeoverPipelineSchema', () => {
    const payload = [
        {
            data: [
                {
                    userId: { $oid: '$oid-1' },
                    passwordChangedAt: '2026-01-02T03:04:05.000Z',
                },
            ],
            total: [{ n: 1 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            data: [
                {
                    userId: '$oid-1',
                    passwordChangedAt: new Date('2026-01-02T03:04:05.000Z'),
                },
            ],
            total: [{ n: 1 }],
        },
    ];
    const invalid = [
        {
            data: [
                {
                    userId: { $oid: 123 },
                    passwordChangedAt: '2026-01-02T03:04:05.000Z',
                },
            ],
            total: [{ n: 1 }],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticAccountTakeoverPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.data.0.userId.$oid of the wrong type', () => {
        const result = AnalyticAccountTakeoverPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 0, 'userId', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});
