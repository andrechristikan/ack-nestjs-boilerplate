import { z } from 'zod';

/** @public */
export const ActivityLogDeviceMetadataSchema = z.strictObject({
    deviceOwnershipId: z.string(),
    deviceId: z.string(),
    sessionCount: z.number(),
});

/** @public */
export type ActivityLogDeviceMetadataDto = z.infer<
    typeof ActivityLogDeviceMetadataSchema
>;
