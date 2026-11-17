import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingSchema } from '@modules/notification/dtos/notification.user-setting.dto';

describe('NotificationUserSettingSchema', () => {
    const row = {
        id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        type: EnumNotificationType.userActivity,
        channel: EnumNotificationChannel.email,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: '507f1f77bcf86cd799439011',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: '507f1f77bcf86cd799439011',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = NotificationUserSettingSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = NotificationUserSettingSchema.parse({
            ...row,
            extra: 'unexpected',
        });

        expect(result).toEqual(row);
    });

    it('omits deletedAt and deletedBy even when present on the input', () => {
        const result = NotificationUserSettingSchema.parse({
            ...row,
            deletedAt: new Date('2026-01-01T00:00:00.000Z'),
            deletedBy: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual(row);
    });

    it('rejects a type outside EnumNotificationType', () => {
        expect(() =>
            NotificationUserSettingSchema.parse({ ...row, type: 'bogus' })
        ).toThrow();
    });

    it('rejects a channel outside EnumNotificationChannel', () => {
        expect(() =>
            NotificationUserSettingSchema.parse({ ...row, channel: 'bogus' })
        ).toThrow();
    });
});
