import { z } from 'zod';

/**
 * Validates the activity-log metadata of a role policy action.
 * @public
 */
export const ActivityLogPolicyMetadataSchema = z.strictObject({
    roleId: z.string(),
    subject: z.string(),
    action: z.string(),
});

/**
 * Activity-log metadata of a role policy action.
 * @public
 */
export type ActivityLogPolicyMetadataDto = z.infer<
    typeof ActivityLogPolicyMetadataSchema
>;
