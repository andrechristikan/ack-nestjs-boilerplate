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
        const result = NotificationUserSettingRequestSchema.safeParse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a channel outside the allowed subset', () => {
        const result = NotificationUserSettingRequestSchema.safeParse({
            ...payload,
            channel: EnumNotificationChannel.silent,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['channel'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a type outside the allowed subset', () => {
        const result = NotificationUserSettingRequestSchema.safeParse({
            ...payload,
            type: EnumNotificationType.securityAlert,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a missing required field', () => {
        const { isActive: _isActive, ...withoutIsActive } = payload;

        const result =
            NotificationUserSettingRequestSchema.safeParse(withoutIsActive);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isActive'],
                code: 'invalid_type',
            }),
        ]);
    });
});
