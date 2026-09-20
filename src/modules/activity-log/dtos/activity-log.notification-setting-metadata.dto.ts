import { z } from 'zod';

/**
 * Validates the activity-log metadata of a notification setting change.
 * @public
 */
export const ActivityLogNotificationSettingMetadataSchema = z
    .strictObject({
        channel: z.string(),
        type: z.string(),
        isActive: z.boolean(),
    })
    .partial();

/**
 * Activity-log metadata of a notification setting change.
 * @public
 */
export type ActivityLogNotificationSettingMetadataDto = z.infer<
    typeof ActivityLogNotificationSettingMetadataSchema
>;
