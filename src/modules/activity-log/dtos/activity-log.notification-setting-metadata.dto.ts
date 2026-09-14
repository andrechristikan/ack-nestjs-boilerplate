import { z } from 'zod';

export const ActivityLogNotificationSettingMetadataSchema = z
    .strictObject({
        channel: z.string(),
        type: z.string(),
        isActive: z.boolean(),
    })
    .partial();

export type ActivityLogNotificationSettingMetadataDto = z.infer<
    typeof ActivityLogNotificationSettingMetadataSchema
>;
