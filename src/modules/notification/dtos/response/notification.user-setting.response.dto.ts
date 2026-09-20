import { z } from 'zod';
import { NotificationUserSettingSchema } from '@modules/notification/dtos/notification.user-setting.dto';

/**
 * Shapes the notification settings returned for the signed-in user.
 * @public
 */
export const NotificationUserSettingResponseSchema = z.object({
    settings: z.array(NotificationUserSettingSchema).meta({
        description: 'List of user notification settings',
        example: [],
    }),
});

/**
 * Notification settings of the signed-in user.
 * @public
 */
export type NotificationUserSettingResponseDto = z.infer<
    typeof NotificationUserSettingResponseSchema
>;
