import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of an admin actor row that acts on a user account.
 * @public
 */
export const ActivityLogUserActorMetadataSchema =
    ActivityLogActorMetadataSchema.extend({
        targetUsername: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    });

/**
 * Metadata of an admin actor row that acts on a user account.
 * @public
 */
export type ActivityLogUserActorMetadataDto = z.infer<
    typeof ActivityLogUserActorMetadataSchema
>;
