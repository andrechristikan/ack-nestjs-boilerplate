import { AnalyticWorkspaceActivityVolumePipelineSchema } from '@modules/analytic/dtos/analytic.workspace-activity-volume-pipeline.dto';

describe('AnalyticWorkspaceActivityVolumePipelineSchema', () => {
    const payload = [
        {
            data: [{ _id: { $oid: '$oid-1' }, count: 1 }],
            total: [{ n: 2 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        { data: [{ _id: '$oid-1', count: 1 }], total: [{ n: 2 }] },
    ];
    const invalid = [
        { data: [{ _id: { $oid: 123 }, count: 1 }], total: [{ n: 2 }] },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticWorkspaceActivityVolumePipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.data.0._id.$oid of the wrong type', () => {
        const result =
            AnalyticWorkspaceActivityVolumePipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 0, '_id', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});
