import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a user row written when an admin revokes every session of that user.
 * @public
 */
export const ActivityLogSessionAllTargetMetadataSchema =
    ActivityLogTargetMetadataSchema.extend({
        sessionCount: z.number(),
    });

/**
 * Metadata of a user row written when an admin revokes every session of that user.
 * @public
 */
export type ActivityLogSessionAllTargetMetadataDto = z.infer<
    typeof ActivityLogSessionAllTargetMetadataSchema
>;
