import { WorkspaceInviteClaimRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';

describe('WorkspaceInviteClaimRequestSchema', () => {
    const payload = { inviteToken: 'a'.repeat(100) };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceInviteClaimRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty inviteToken', () => {
        const result = WorkspaceInviteClaimRequestSchema.safeParse({
            inviteToken: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['inviteToken'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceInviteClaimRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a inviteToken of 200 characters and rejects one of 201', () => {
        expect(() =>
            WorkspaceInviteClaimRequestSchema.parse({
                ...payload,
                inviteToken: 'a'.repeat(200),
            })
        ).not.toThrow();
        const result = WorkspaceInviteClaimRequestSchema.safeParse({
            ...payload,
            inviteToken: 'a'.repeat(201),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['inviteToken'], code: 'too_big' }),
        ]);
    });
});
