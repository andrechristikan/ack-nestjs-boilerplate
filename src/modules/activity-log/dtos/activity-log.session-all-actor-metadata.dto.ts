import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of an admin actor row that revokes every session of a user.
 * @public
 */
export const ActivityLogSessionAllActorMetadataSchema =
    ActivityLogActorMetadataSchema.extend({
        sessionCount: z.number(),
    });

/**
 * Metadata of an admin actor row that revokes every session of a user.
 * @public
 */
export type ActivityLogSessionAllActorMetadataDto = z.infer<
    typeof ActivityLogSessionAllActorMetadataSchema
>;
