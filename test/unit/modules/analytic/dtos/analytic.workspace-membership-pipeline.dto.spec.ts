import { AnalyticWorkspaceMembershipPipelineSchema } from '@modules/analytic/dtos/analytic.workspace-membership-pipeline.dto';

describe('AnalyticWorkspaceMembershipPipelineSchema', () => {
    const payload = [
        { _id: { $oid: '$oid-1' }, count: 1, undeclared: 'extra' },
    ];
    const expected = [{ _id: '$oid-1', count: 1 }];
    const invalid = [{ _id: { $oid: 123 }, count: 1 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticWorkspaceMembershipPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0._id.$oid of the wrong type', () => {
        const result =
            AnalyticWorkspaceMembershipPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, '_id', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});
