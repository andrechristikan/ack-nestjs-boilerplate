import { z } from 'zod';

/**
 * Validates the activity-log metadata of a term policy action.
 * @public
 */
export const ActivityLogTermPolicyMetadataSchema = z
    .strictObject({
        termPolicyId: z.string(),
        termPolicyType: z.string(),
        termPolicyVersion: z.union([z.string(), z.number()]),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

/**
 * Activity-log metadata of a term policy action.
 * @public
 */
export type ActivityLogTermPolicyMetadataDto = z.infer<
    typeof ActivityLogTermPolicyMetadataSchema
>;
