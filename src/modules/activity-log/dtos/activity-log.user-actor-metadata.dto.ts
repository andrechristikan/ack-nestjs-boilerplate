import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogUserActorMetadataSchema =
    ActivityLogActorMetadataSchema.extend({
        targetUsername: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    });

/** @public */
export type ActivityLogUserActorMetadataDto = z.infer<
    typeof ActivityLogUserActorMetadataSchema
>;
