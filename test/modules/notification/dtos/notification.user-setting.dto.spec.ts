import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingSchema } from '@modules/notification/dtos/notification.user-setting.dto';

describe('NotificationUserSettingSchema', () => {
    it('selects public fields and excludes soft-delete fields', () => {
        const now = new Date();
        const result = NotificationUserSettingSchema.parse({
            id: 'setting-id',
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: now,
            deletedBy: 'actor-id',
            userId: 'user-id',
            type: EnumNotificationType.marketing,
            channel: EnumNotificationChannel.push,
            isActive: false,
            secret: 'hidden',
        });

        expect(result).toMatchObject({ createdBy: null, updatedBy: null });
        expect(result).not.toHaveProperty('deletedAt');
        expect(result).not.toHaveProperty('deletedBy');
        expect(result).not.toHaveProperty('secret');
    });
});
