import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a user row written when an admin revokes one of that user's sessions.
 * @public
 */
export const ActivityLogSessionTargetMetadataSchema =
    ActivityLogUserTargetMetadataSchema.extend({
        sessionId: z.string(),
    });

/**
 * Metadata of a user row written when an admin revokes one of that user's sessions.
 * @public
 */
export type ActivityLogSessionTargetMetadataDto = z.infer<
    typeof ActivityLogSessionTargetMetadataSchema
>;
