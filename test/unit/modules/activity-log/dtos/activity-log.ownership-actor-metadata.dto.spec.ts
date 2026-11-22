import { ActivityLogOwnershipActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.ownership-actor-metadata.dto';

describe('ActivityLogOwnershipActorMetadataSchema', () => {
    const payload = {
        workspaceId: 'workspace-1',
        previousOwnerUserId: 'user-1',
        targetUserId: 'user-2',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogOwnershipActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogOwnershipActorMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogOwnershipActorMetadataSchema.parse({
                targetUserId: 'user-2',
            })
        ).toThrow();
    });
});
