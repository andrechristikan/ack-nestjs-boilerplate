import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';

describe('ActivityLogInviteEmailMetadataSchema', () => {
    const payload = { workspaceInviteId: 'invite-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogInviteEmailMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogInviteEmailMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing workspaceInviteId', () => {
        const result = ActivityLogInviteEmailMetadataSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceInviteId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
