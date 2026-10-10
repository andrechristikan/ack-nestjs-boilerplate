import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingRequestSchema } from '@modules/notification/dtos/request/notification.user-setting.request.dto';

describe('NotificationUserSettingRequestSchema', () => {
    const valid = {
        channel: EnumNotificationChannel.email,
        type: EnumNotificationType.userActivity,
        isActive: true,
    };

    it.each([
        EnumNotificationChannel.email,
        EnumNotificationChannel.push,
        EnumNotificationChannel.inApp,
    ])('accepts the supported channel', channel => {
        expect(
            NotificationUserSettingRequestSchema.parse({ ...valid, channel })
        ).toEqual({ ...valid, channel });
    });

    it.each([
        { ...valid, channel: 'sms' },
        { ...valid, type: EnumNotificationType.securityAlert },
        { ...valid, isActive: 'true' },
        { ...valid, unknown: true },
    ])('rejects unsupported or unknown input', input => {
        expect(
            NotificationUserSettingRequestSchema.safeParse(input).success
        ).toBe(false);
    });
});
