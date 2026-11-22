import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogSessionAllActorMetadataSchema =
    ActivityLogActorMetadataSchema.extend({
        sessionCount: z.number(),
    });

/** @public */
export type ActivityLogSessionAllActorMetadataDto = z.infer<
    typeof ActivityLogSessionAllActorMetadataSchema
>;
