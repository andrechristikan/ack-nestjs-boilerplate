import { faker } from '@faker-js/faker';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingSchema } from '@modules/notification/dtos/notification.user-setting.dto';

describe('NotificationUserSettingSchema', () => {
    const row = {
        id: faker.database.mongodbObjectId(),
        userId: faker.database.mongodbObjectId(),
        type: EnumNotificationType.userActivity,
        channel: EnumNotificationChannel.email,
        isActive: true,
        createdAt: new Date(),
        createdBy: faker.database.mongodbObjectId(),
        updatedAt: new Date(),
        updatedBy: faker.database.mongodbObjectId(),
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
            deletedAt: new Date(),
            deletedBy: faker.database.mongodbObjectId(),
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
