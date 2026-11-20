import { ActivityLogDeviceActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-actor-metadata.dto';

describe('ActivityLogDeviceActorMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        targetUserId: 'user-1',
        targetUsername: 'jane',
        timestamp,
        deviceOwnershipId: 'device-ownership-1',
        deviceId: 'device-1',
        sessionCount: 2,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogDeviceActorMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogDeviceActorMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing field', () => {
        const result = ActivityLogDeviceActorMetadataSchema.safeParse({
            targetUserId: 'user-1',
            targetUsername: 'jane',
            timestamp,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['deviceOwnershipId'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['deviceId'],
                code: 'invalid_type',
            }),
            expect.objectContaining({
                path: ['sessionCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
