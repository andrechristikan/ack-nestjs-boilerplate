import { z } from 'zod';

/** @public */
export const ActivityLogNotificationSettingMetadataSchema = z.strictObject({
    channel: z.string().exactOptional(),
    type: z.string().exactOptional(),
    isActive: z.boolean().exactOptional(),
});

/** @public */
export type ActivityLogNotificationSettingMetadataDto = z.infer<
    typeof ActivityLogNotificationSettingMetadataSchema
>;
