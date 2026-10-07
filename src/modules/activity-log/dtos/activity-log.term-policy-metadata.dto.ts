import { z } from 'zod';

/**
 * Validates the activity-log metadata of a term policy action.
 * @public
 */
export const ActivityLogTermPolicyMetadataSchema = z.strictObject({
    termPolicyId: z.string().exactOptional(),
    termPolicyType: z.string().exactOptional(),
    termPolicyVersion: z.union([z.string(), z.number()]).exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/**
 * Activity-log metadata of a term policy action.
 * @public
 */
export type ActivityLogTermPolicyMetadataDto = z.infer<
    typeof ActivityLogTermPolicyMetadataSchema
>;
