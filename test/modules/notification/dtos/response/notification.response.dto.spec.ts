import { faker } from '@faker-js/faker';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationResponseSchema } from '@modules/notification/dtos/response/notification.response.dto';

describe('NotificationResponseSchema', () => {
    const row = {
        id: faker.database.mongodbObjectId(),
        userId: faker.database.mongodbObjectId(),
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.high,
        title: 'Login',
        body: 'Login from web via credential',
        metadata: { exampleKey: 'exampleValue' },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        createdBy: faker.database.mongodbObjectId(),
        updatedAt: new Date(),
        updatedBy: faker.database.mongodbObjectId(),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = NotificationResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = NotificationResponseSchema.parse({
            ...row,
            extra: 'unexpected',
        });

        expect(result).toEqual(row);
    });

    it('omits deletedAt and deletedBy even when present on the input', () => {
        const result = NotificationResponseSchema.parse({
            ...row,
            deletedAt: new Date(),
            deletedBy: faker.database.mongodbObjectId(),
        });

        expect(result).toEqual(row);
    });

    it('accepts a readAt date when the notification was read', () => {
        const readAt = new Date();

        const result = NotificationResponseSchema.parse({
            ...row,
            isRead: true,
            readAt,
        });

        expect(result).toEqual({ ...row, isRead: true, readAt });
    });

    it('rejects a type outside EnumNotificationType', () => {
        expect(() =>
            NotificationResponseSchema.parse({ ...row, type: 'bogus' })
        ).toThrow();
    });

    it('rejects a priority outside EnumNotificationPriority', () => {
        expect(() =>
            NotificationResponseSchema.parse({ ...row, priority: 'bogus' })
        ).toThrow();
    });
});
