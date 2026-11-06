import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogSessionAllTargetMetadataSchema =
    ActivityLogTargetMetadataSchema.extend({
        sessionCount: z.number(),
    });

/** @public */
export type ActivityLogSessionAllTargetMetadataDto = z.infer<
    typeof ActivityLogSessionAllTargetMetadataSchema
>;
