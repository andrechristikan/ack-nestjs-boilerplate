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
        const result = ActivityLogOwnershipActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing field', () => {
        const result = ActivityLogOwnershipActorMetadataSchema.safeParse({
            targetUserId: 'user-2',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['previousOwnerUserId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
