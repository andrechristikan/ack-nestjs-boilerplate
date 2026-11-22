import { ActivityLogInviteAccountMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-account-metadata.dto';

describe('ActivityLogInviteAccountMetadataSchema', () => {
    const payload = { workspaceInviteId: 'invite-1', targetUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogInviteAccountMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogInviteAccountMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing targetUserId', () => {
        expect(() =>
            ActivityLogInviteAccountMetadataSchema.parse({
                workspaceInviteId: 'invite-1',
            })
        ).toThrow();
    });
});
