import { z } from 'zod';

/** @public */
export const ActivityLogActorMetadataSchema = z.strictObject({
    targetUserId: z.string(),
});

/** @public */
export type ActivityLogActorMetadataDto = z.infer<
    typeof ActivityLogActorMetadataSchema
>;
