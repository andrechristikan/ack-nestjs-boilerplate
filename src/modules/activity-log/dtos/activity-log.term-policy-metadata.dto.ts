import { z } from 'zod';

/** @public */
export const ActivityLogTermPolicyMetadataSchema = z.strictObject({
    termPolicyId: z.string().exactOptional(),
    termPolicyType: z.string().exactOptional(),
    termPolicyVersion: z.union([z.string(), z.number()]).exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/** @public */
export type ActivityLogTermPolicyMetadataDto = z.infer<
    typeof ActivityLogTermPolicyMetadataSchema
>;
