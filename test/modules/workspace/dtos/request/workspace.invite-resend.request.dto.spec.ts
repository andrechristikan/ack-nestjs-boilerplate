import { WorkspaceInviteResendRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceInviteResendRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceInviteResendRequestSchema.parse({
            expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
        });

        expect(result).toEqual({
            expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceInviteResendRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceInviteResendRequestSchema.parse({
                email: 'someone@example.com',
            })
        ).toThrow();
    });
});
