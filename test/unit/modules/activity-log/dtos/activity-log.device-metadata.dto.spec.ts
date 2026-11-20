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
        const result = ActivityLogDeviceMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a missing field', () => {
        const result = ActivityLogDeviceMetadataSchema.safeParse({
            deviceOwnershipId: 'device-ownership-1',
            deviceId: 'device-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['sessionCount'],
                code: 'invalid_type',
            }),
        ]);
    });
});
