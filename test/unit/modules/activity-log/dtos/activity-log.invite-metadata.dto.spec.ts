import { ActivityLogInviteMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-metadata.dto';

describe('ActivityLogInviteMetadataSchema', () => {
    it('parses a payload matching the account branch', () => {
        const payload = {
            workspaceInviteId: 'invite-1',
            targetUserId: 'user-1',
        };

        const result = ActivityLogInviteMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses a payload matching the email-only branch', () => {
        const payload = { workspaceInviteId: 'invite-1' };

        const result = ActivityLogInviteMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a payload matching neither branch', () => {
        expect(() =>
            ActivityLogInviteMetadataSchema.parse({ extra: true })
        ).toThrow();
    });
});
