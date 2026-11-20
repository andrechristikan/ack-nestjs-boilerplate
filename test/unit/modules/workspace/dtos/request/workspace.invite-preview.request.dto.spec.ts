import { WorkspaceInvitePreviewRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';

describe('WorkspaceInvitePreviewRequestSchema', () => {
    const payload = { inviteToken: 'a'.repeat(100) };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceInvitePreviewRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims the inviteToken', () => {
        const result = WorkspaceInvitePreviewRequestSchema.parse({
            inviteToken: '  token  ',
        });

        expect(result).toEqual({ inviteToken: 'token' });
    });

    it('rejects an empty inviteToken', () => {
        const result = WorkspaceInvitePreviewRequestSchema.safeParse({
            inviteToken: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['inviteToken'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects a whitespace-only inviteToken', () => {
        const result = WorkspaceInvitePreviewRequestSchema.safeParse({
            inviteToken: '   ',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['inviteToken'],
                code: 'too_small',
            }),
        ]);
    });

    it('rejects an inviteToken longer than 200 characters', () => {
        const result = WorkspaceInvitePreviewRequestSchema.safeParse({
            inviteToken: 'a'.repeat(201),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['inviteToken'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceInvitePreviewRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
