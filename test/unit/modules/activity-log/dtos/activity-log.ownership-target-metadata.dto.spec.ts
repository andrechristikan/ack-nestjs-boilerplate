import { ActivityLogOwnershipTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.ownership-target-metadata.dto';

describe('ActivityLogOwnershipTargetMetadataSchema', () => {
    const payload = {
        actorUserId: 'user-1',
        targetUserId: 'user-2',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogOwnershipTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogOwnershipTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogOwnershipTargetMetadataSchema.parse({
                actorUserId: 'user-1',
            })
        ).toThrow();
    });
});
