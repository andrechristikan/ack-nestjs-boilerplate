import { AnalyticSnapshotListPipelineSchema } from '@modules/analytic/dtos/analytic.snapshot-list-pipeline.dto';

describe('AnalyticSnapshotListPipelineSchema', () => {
    const payload = [
        {
            computedAt: '2025-01-01T00:00:00.000Z',
            page: [
                {
                    data: [
                        { data: { userId: 'userId-1' }, undeclared: 'extra' },
                    ],
                    total: [{ n: 1, undeclared: 'extra' }],
                    undeclared: 'extra',
                },
            ],
            undeclared: 'extra',
        },
    ];
    const expected = [
        {
            computedAt: new Date('2025-01-01T00:00:00.000Z'),
            page: [
                {
                    data: [{ data: { userId: 'userId-1' } }],
                    total: [{ n: 1 }],
                },
            ],
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticSnapshotListPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
        expect(result[0]?.page[0]?.data[0]?.data).toEqual({
            userId: 'userId-1',
        });
    });

    it('refuses a payload with 0.computedAt that is not a date', () => {
        const result = AnalyticSnapshotListPipelineSchema.safeParse([
            { ...payload[0], computedAt: 'not-a-date' },
        ]);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'computedAt'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('refuses a payload with 0.page.0.total.0.n of the wrong type', () => {
        const result = AnalyticSnapshotListPipelineSchema.safeParse([
            {
                ...payload[0],
                page: [{ data: [], total: [{ n: 'one' }] }],
            },
        ]);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'page', 0, 'total', 0, 'n'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('refuses a payload missing 0.page.0.data.0.data', () => {
        const result = AnalyticSnapshotListPipelineSchema.safeParse([
            {
                ...payload[0],
                page: [{ data: [{}], total: [] }],
            },
        ]);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'page', 0, 'data', 0, 'data'],
                code: 'invalid_union',
            }),
        ]);
    });
});
