import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of an admin actor row that removes a device of a user.
 * @public
 */
export const ActivityLogDeviceActorMetadataSchema =
    ActivityLogUserActorMetadataSchema.extend({
        deviceOwnershipId: z.string(),
        deviceId: z.string(),
        sessionCount: z.number(),
    });

/**
 * Metadata of an admin actor row that removes a device of a user.
 * @public
 */
export type ActivityLogDeviceActorMetadataDto = z.infer<
    typeof ActivityLogDeviceActorMetadataSchema
>;
