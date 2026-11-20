import { ActivityLogInviteAccountMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-account-metadata.dto';

describe('ActivityLogInviteAccountMetadataSchema', () => {
    const payload = { workspaceInviteId: 'invite-1', targetUserId: 'user-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogInviteAccountMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogInviteAccountMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing targetUserId', () => {
        const result = ActivityLogInviteAccountMetadataSchema.safeParse({
            workspaceInviteId: 'invite-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
