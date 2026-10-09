import { faker } from '@faker-js/faker';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingResponseSchema } from '@modules/notification/dtos/response/notification.user-setting.response.dto';

describe('NotificationUserSettingResponseSchema', () => {
    const setting = {
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
    const payload = { settings: [setting] };

    it('parses a payload into exactly the declared fields', () => {
        const result = NotificationUserSettingResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty settings list', () => {
        const result = NotificationUserSettingResponseSchema.parse({
            settings: [],
        });

        expect(result).toEqual({ settings: [] });
    });

    it('strips an undeclared key', () => {
        const result = NotificationUserSettingResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a missing settings field', () => {
        expect(() => NotificationUserSettingResponseSchema.parse({})).toThrow();
    });
});
