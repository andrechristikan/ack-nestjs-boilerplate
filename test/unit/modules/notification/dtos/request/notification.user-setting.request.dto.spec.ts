import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingRequestSchema } from '@modules/notification/dtos/request/notification.user-setting.request.dto';

describe('NotificationUserSettingRequestSchema', () => {
    const payload = {
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: true,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = NotificationUserSettingRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            NotificationUserSettingRequestSchema.parse({
                ...payload,
                extra: 'unexpected',
            })
        ).toThrow();
    });

    it('rejects a channel outside the allowed subset', () => {
        expect(() =>
            NotificationUserSettingRequestSchema.parse({
                ...payload,
                channel: EnumNotificationChannel.silent,
            })
        ).toThrow();
    });

    it('rejects a type outside the allowed subset', () => {
        expect(() =>
            NotificationUserSettingRequestSchema.parse({
                ...payload,
                type: EnumNotificationType.securityAlert,
            })
        ).toThrow();
    });

    it('rejects a missing required field', () => {
        const { isActive: _isActive, ...withoutIsActive } = payload;

        expect(() =>
            NotificationUserSettingRequestSchema.parse(withoutIsActive)
        ).toThrow();
    });
});
