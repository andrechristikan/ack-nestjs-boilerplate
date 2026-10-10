import { WorkspaceInviteClaimRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
describe('WorkspaceInviteClaimRequestSchema', () => {
    it('accepts a token', () =>
        expect(
            WorkspaceInviteClaimRequestSchema.parse({ inviteToken: 'token' })
        ).toEqual({ inviteToken: 'token' }));
    it.each([{ inviteToken: '' }, { inviteToken: 'token', unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(
                WorkspaceInviteClaimRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
