import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { z } from 'zod';

/**
 * Validates the metadata of a user row written for an action an admin performed on that account.
 * @public
 */
export const ActivityLogUserTargetMetadataSchema =
    ActivityLogTargetMetadataSchema.extend({
        timestamp: z.union([z.string(), z.date()]),
    });

/**
 * Metadata of a user row written for an admin action on that account.
 * @public
 */
export type ActivityLogUserTargetMetadataDto = z.infer<
    typeof ActivityLogUserTargetMetadataSchema
>;
