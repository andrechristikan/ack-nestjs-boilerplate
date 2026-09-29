import { ActivityLogDeviceTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-target-metadata.dto';

describe('ActivityLogDeviceTargetMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        actorUserId: 'user-1',
        timestamp,
        deviceOwnershipId: 'device-ownership-1',
        deviceId: 'device-1',
        sessionCount: 2,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogDeviceTargetMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogDeviceTargetMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogDeviceTargetMetadataSchema.parse({
                actorUserId: 'user-1',
                timestamp,
            })
        ).toThrow();
    });
});
