import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogUserTargetMetadataSchema =
    ActivityLogTargetMetadataSchema.extend({
        timestamp: z.union([z.string(), z.date()]),
    });

/** @public */
export type ActivityLogUserTargetMetadataDto = z.infer<
    typeof ActivityLogUserTargetMetadataSchema
>;
