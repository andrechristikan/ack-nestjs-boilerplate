import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogDeviceTargetMetadataSchema =
    ActivityLogUserTargetMetadataSchema.extend(
        ActivityLogDeviceMetadataSchema.shape
    );

/** @public */
export type ActivityLogDeviceTargetMetadataDto = z.infer<
    typeof ActivityLogDeviceTargetMetadataSchema
>;
