import { AnalyticWorkspaceMembershipSnapshotDataSchema } from '@modules/analytic/dtos/analytic.workspace-membership-snapshot-data.dto';

describe('AnalyticWorkspaceMembershipSnapshotDataSchema', () => {
    const payload = {
        workspaceId: 'workspaceId-1',
        count: 1,
        undeclared: 'extra',
    };
    const expected = { workspaceId: 'workspaceId-1', count: 1 };
    const invalid = { workspaceId: 123, count: 1 };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticWorkspaceMembershipSnapshotDataSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with workspaceId of the wrong type', () => {
        const result =
            AnalyticWorkspaceMembershipSnapshotDataSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
