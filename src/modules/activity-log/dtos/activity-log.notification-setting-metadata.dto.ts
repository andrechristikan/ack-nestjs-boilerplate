import { z } from 'zod';

/**
 * Validates the activity-log metadata of a notification setting change.
 * @public
 */
export const ActivityLogNotificationSettingMetadataSchema = z.strictObject({
    channel: z.string().exactOptional(),
    type: z.string().exactOptional(),
    isActive: z.boolean().exactOptional(),
});

/**
 * Activity-log metadata of a notification setting change.
 * @public
 */
export type ActivityLogNotificationSettingMetadataDto = z.infer<
    typeof ActivityLogNotificationSettingMetadataSchema
>;
