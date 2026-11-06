import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogSessionActorMetadataSchema =
    ActivityLogUserActorMetadataSchema.extend({
        sessionId: z.string(),
    });

/** @public */
export type ActivityLogSessionActorMetadataDto = z.infer<
    typeof ActivityLogSessionActorMetadataSchema
>;
