import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of an admin actor row that removes a device of a user.
 * @public
 */
export const ActivityLogDeviceActorMetadataSchema =
    ActivityLogUserActorMetadataSchema.extend(
        ActivityLogDeviceMetadataSchema.shape
    );

/**
 * Metadata of an admin actor row that removes a device of a user.
 * @public
 */
export type ActivityLogDeviceActorMetadataDto = z.infer<
    typeof ActivityLogDeviceActorMetadataSchema
>;
