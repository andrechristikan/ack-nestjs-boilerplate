import { z } from 'zod';

/** @public */
export const ActivityLogPolicyMetadataSchema = z.strictObject({
    roleId: z.string(),
    subject: z.string(),
    action: z.string(),
});

/** @public */
export type ActivityLogPolicyMetadataDto = z.infer<
    typeof ActivityLogPolicyMetadataSchema
>;
