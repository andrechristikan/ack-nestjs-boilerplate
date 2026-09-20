import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a user row written when an admin removes one of that user's devices.
 * @public
 */
export const ActivityLogDeviceTargetMetadataSchema =
    ActivityLogUserTargetMetadataSchema.extend(
        ActivityLogDeviceMetadataSchema.shape
    );

/**
 * Metadata of a user row written when an admin removes one of that user's devices.
 * @public
 */
export type ActivityLogDeviceTargetMetadataDto = z.infer<
    typeof ActivityLogDeviceTargetMetadataSchema
>;
