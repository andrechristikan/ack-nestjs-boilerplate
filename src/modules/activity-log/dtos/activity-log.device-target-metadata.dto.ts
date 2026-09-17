import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a user row written when an admin removes one of that user's devices.
 * @public
 */
export const ActivityLogDeviceTargetMetadataSchema =
    ActivityLogUserTargetMetadataSchema.extend({
        deviceOwnershipId: z.string(),
        deviceId: z.string(),
        sessionCount: z.number(),
    });

/**
 * Metadata of a user row written when an admin removes one of that user's devices.
 * @public
 */
export type ActivityLogDeviceTargetMetadataDto = z.infer<
    typeof ActivityLogDeviceTargetMetadataSchema
>;
