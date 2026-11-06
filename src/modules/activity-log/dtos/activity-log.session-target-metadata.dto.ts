import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogSessionTargetMetadataSchema =
    ActivityLogUserTargetMetadataSchema.extend({
        sessionId: z.string(),
    });

/** @public */
export type ActivityLogSessionTargetMetadataDto = z.infer<
    typeof ActivityLogSessionTargetMetadataSchema
>;
