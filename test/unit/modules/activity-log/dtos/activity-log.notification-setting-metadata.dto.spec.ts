import { ActivityLogNotificationSettingMetadataSchema } from '@modules/activity-log/dtos/activity-log.notification-setting-metadata.dto';

describe('ActivityLogNotificationSettingMetadataSchema', () => {
    const payload = { channel: 'email', type: 'userActivity', isActive: true };

    it('parses a payload into exactly the declared fields', () => {
        const result =
            ActivityLogNotificationSettingMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with every field omitted', () => {
        const result = ActivityLogNotificationSettingMetadataSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogNotificationSettingMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
