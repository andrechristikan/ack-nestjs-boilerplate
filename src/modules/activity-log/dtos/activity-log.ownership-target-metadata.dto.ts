import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { z } from 'zod';

/** @public */
export const ActivityLogOwnershipTargetMetadataSchema =
    ActivityLogTargetMetadataSchema.extend({
        targetUserId: z.string(),
    });

/** @public */
export type ActivityLogOwnershipTargetMetadataDto = z.infer<
    typeof ActivityLogOwnershipTargetMetadataSchema
>;
