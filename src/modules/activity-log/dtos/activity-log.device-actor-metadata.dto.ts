import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogDeviceActorMetadataSchema =
    ActivityLogUserActorMetadataSchema.extend(
        ActivityLogDeviceMetadataSchema.shape
    );

/** @public */
export type ActivityLogDeviceActorMetadataDto = z.infer<
    typeof ActivityLogDeviceActorMetadataSchema
>;
