import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of an admin actor row that revokes one session of a user.
 * @public
 */
export const ActivityLogSessionActorMetadataSchema =
    ActivityLogUserActorMetadataSchema.extend({
        sessionId: z.string(),
    });

/**
 * Metadata of an admin actor row that revokes one session of a user.
 * @public
 */
export type ActivityLogSessionActorMetadataDto = z.infer<
    typeof ActivityLogSessionActorMetadataSchema
>;
