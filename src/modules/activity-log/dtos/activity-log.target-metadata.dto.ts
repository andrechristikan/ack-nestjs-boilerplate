import { z } from 'zod';

/**
 * Validates the metadata of a target row: the user who performed the action.
 * @public
 */
export const ActivityLogTargetMetadataSchema = z.strictObject({
    actorUserId: z.string(),
});

/**
 * Metadata of a target row.
 * @public
 */
export type ActivityLogTargetMetadataDto = z.infer<
    typeof ActivityLogTargetMetadataSchema
>;
