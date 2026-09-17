import { z } from 'zod';

/**
 * Validates the metadata of a device removal row: the ownership, its device, and the number of sessions the removal revoked.
 * @public
 */
export const ActivityLogDeviceMetadataSchema = z.strictObject({
    deviceOwnershipId: z.string(),
    deviceId: z.string(),
    sessionCount: z.number(),
});

/**
 * Metadata of a device removal row.
 * @public
 */
export type ActivityLogDeviceMetadataDto = z.infer<
    typeof ActivityLogDeviceMetadataSchema
>;
