import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingResponseSchema } from '@modules/notification/dtos/response/notification.user-setting.response.dto';

describe('NotificationUserSettingResponseSchema', () => {
    it('returns selected settings and strips unknown fields', () => {
        const now = new Date();
        const result = NotificationUserSettingResponseSchema.parse({
            settings: [
                {
                    id: 'setting-id',
                    createdAt: now,
                    createdBy: null,
                    updatedAt: now,
                    updatedBy: null,
                    userId: 'user-id',
                    type: EnumNotificationType.userActivity,
                    channel: EnumNotificationChannel.email,
                    isActive: true,
                    secret: 'hidden',
                },
            ],
            unknown: true,
        });

        expect(result.settings).toHaveLength(1);
        expect(result.settings[0]).not.toHaveProperty('secret');
        expect(result).not.toHaveProperty('unknown');
    });

    it('accepts an empty setting list', () => {
        expect(
            NotificationUserSettingResponseSchema.parse({ settings: [] })
        ).toEqual({
            settings: [],
        });
    });
});
