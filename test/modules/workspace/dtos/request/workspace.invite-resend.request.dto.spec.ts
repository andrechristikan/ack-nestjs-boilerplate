import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteResendRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
describe('WorkspaceInviteResendRequestSchema', () => {
    it.each([{}, { expiryDuration: EnumWorkspaceInviteExpiry.oneMonth }])(
        'accepts optional supported expiry',
        input =>
            expect(
                WorkspaceInviteResendRequestSchema.safeParse(input).success
            ).toBe(true)
    );
    it.each([{ expiryDuration: 2 }, { unknown: true }])(
        'rejects invalid or unknown input',
        input =>
            expect(
                WorkspaceInviteResendRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
