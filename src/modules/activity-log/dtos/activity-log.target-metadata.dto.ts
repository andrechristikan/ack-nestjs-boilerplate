import { z } from 'zod';

/** @public */
export const ActivityLogTargetMetadataSchema = z.strictObject({
    actorUserId: z.string(),
});

/** @public */
export type ActivityLogTargetMetadataDto = z.infer<
    typeof ActivityLogTargetMetadataSchema
>;
