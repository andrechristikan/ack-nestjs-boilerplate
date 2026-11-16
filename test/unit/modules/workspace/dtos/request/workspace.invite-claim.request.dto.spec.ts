import { WorkspaceInviteClaimRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';

describe('WorkspaceInviteClaimRequestSchema', () => {
    const payload = { inviteToken: 'a'.repeat(100) };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceInviteClaimRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty inviteToken', () => {
        expect(() =>
            WorkspaceInviteClaimRequestSchema.parse({ inviteToken: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceInviteClaimRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });

    it('accepts a inviteToken of 200 characters and rejects one of 201', () => {
        expect(() =>
            WorkspaceInviteClaimRequestSchema.parse({
                ...payload,
                inviteToken: 'a'.repeat(200),
            })
        ).not.toThrow();
        expect(() =>
            WorkspaceInviteClaimRequestSchema.parse({
                ...payload,
                inviteToken: 'a'.repeat(201),
            })
        ).toThrow();
    });
});
