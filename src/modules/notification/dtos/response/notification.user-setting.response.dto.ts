import { z } from 'zod';
import { NotificationUserSettingSchema } from '@modules/notification/dtos/notification.user-setting.dto';

export const NotificationUserSettingResponseSchema = z.object({
    settings: z.array(NotificationUserSettingSchema).meta({
        description: 'List of user notification settings',
        example: [],
    }),
});

export type NotificationUserSettingResponseDto = z.infer<
    typeof NotificationUserSettingResponseSchema
>;
