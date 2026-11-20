import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationResponseSchema } from '@modules/notification/dtos/response/notification.response.dto';

describe('NotificationResponseSchema', () => {
    const row = {
        id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        type: EnumNotificationType.securityAlert,
        priority: EnumNotificationPriority.high,
        title: 'Login',
        body: 'Login from web via credential',
        metadata: { exampleKey: 'exampleValue' },
        isRead: false,
        readAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: '507f1f77bcf86cd799439011',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: '507f1f77bcf86cd799439011',
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
            deletedAt: new Date('2026-01-01T00:00:00.000Z'),
            deletedBy: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual(row);
    });

    it('accepts a readAt date when the notification was read', () => {
        const readAt = new Date('2026-01-01T00:00:00.000Z');

        const result = NotificationResponseSchema.parse({
            ...row,
            isRead: true,
            readAt,
        });

        expect(result).toEqual({ ...row, isRead: true, readAt });
    });

    it('rejects a type outside EnumNotificationType', () => {
        const result = NotificationResponseSchema.safeParse({
            ...row,
            type: 'bogus',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a priority outside EnumNotificationPriority', () => {
        const result = NotificationResponseSchema.safeParse({
            ...row,
            priority: 'bogus',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['priority'],
                code: 'invalid_value',
            }),
        ]);
    });
});
