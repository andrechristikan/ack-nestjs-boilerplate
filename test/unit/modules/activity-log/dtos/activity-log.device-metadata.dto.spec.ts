import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';

describe('ActivityLogDeviceMetadataSchema', () => {
    const payload = {
        deviceOwnershipId: 'device-ownership-1',
        deviceId: 'device-1',
        sessionCount: 2,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogDeviceMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogDeviceMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });

    it('rejects a missing field', () => {
        expect(() =>
            ActivityLogDeviceMetadataSchema.parse({
                deviceOwnershipId: 'device-ownership-1',
                deviceId: 'device-1',
            })
        ).toThrow();
    });
});
