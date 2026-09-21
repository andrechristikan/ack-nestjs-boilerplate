import { z } from 'zod';

/**
 * Validates the metadata of an actor row: the user the action was performed on.
 * @public
 */
export const ActivityLogActorMetadataSchema = z.strictObject({
    targetUserId: z.string(),
});

/**
 * Metadata of an actor row.
 * @public
 */
export type ActivityLogActorMetadataDto = z.infer<
    typeof ActivityLogActorMetadataSchema
>;
