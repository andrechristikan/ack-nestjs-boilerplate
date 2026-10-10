import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client';
import { WorkspaceJoinRequestRejectRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
describe('WorkspaceJoinRequestRejectRequestSchema', () => {
    it('accepts a defined reason', () =>
        expect(
            WorkspaceJoinRequestRejectRequestSchema.safeParse({
                rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
            }).success
        ).toBe(true));
    it.each([
        { rejectReasonCode: 'invalid' },
        {
            rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
            unknown: true,
        },
    ])('rejects invalid or unknown input', input =>
        expect(
            WorkspaceJoinRequestRejectRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
