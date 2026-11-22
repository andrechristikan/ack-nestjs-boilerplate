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
        expect(() =>
            WorkspaceInvitePreviewRequestSchema.parse({ inviteToken: '' })
        ).toThrow();
    });

    it('rejects a whitespace-only inviteToken', () => {
        expect(() =>
            WorkspaceInvitePreviewRequestSchema.parse({ inviteToken: '   ' })
        ).toThrow();
    });

    it('rejects an inviteToken longer than 200 characters', () => {
        expect(() =>
            WorkspaceInvitePreviewRequestSchema.parse({
                inviteToken: 'a'.repeat(201),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceInvitePreviewRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
