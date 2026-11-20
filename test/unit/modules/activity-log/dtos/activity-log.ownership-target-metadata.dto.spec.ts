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
        const result = ActivityLogOwnershipTargetMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing field', () => {
        const result = ActivityLogOwnershipTargetMetadataSchema.safeParse({
            actorUserId: 'user-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
