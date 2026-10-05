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
        expect(() =>
            ActivityLogDeviceActorMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogDeviceActorMetadataSchema.parse({
                targetUserId: 'user-1',
                targetUsername: 'jane',
                timestamp,
            })
        ).toThrow();
    });
});
