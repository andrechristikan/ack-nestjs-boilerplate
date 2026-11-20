import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationUserSettingResponseSchema } from '@modules/notification/dtos/response/notification.user-setting.response.dto';

describe('NotificationUserSettingResponseSchema', () => {
    const setting = {
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
        const result = NotificationUserSettingResponseSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['settings'],
                code: 'invalid_type',
            }),
        ]);
    });
});
