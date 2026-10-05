import { ActivityLogInviteEmailMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-email-metadata.dto';

describe('ActivityLogInviteEmailMetadataSchema', () => {
    const payload = { workspaceInviteId: 'invite-1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogInviteEmailMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogInviteEmailMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing workspaceInviteId', () => {
        expect(() => ActivityLogInviteEmailMetadataSchema.parse({})).toThrow();
    });
});
