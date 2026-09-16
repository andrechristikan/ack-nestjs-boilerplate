import { z } from 'zod';

export const ActivityLogTermPolicyMetadataSchema = z
    .strictObject({
        termPolicyId: z.string(),
        termPolicyType: z.string(),
        termPolicyVersion: z.union([z.string(), z.number()]),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

export type ActivityLogTermPolicyMetadataDto = z.infer<
    typeof ActivityLogTermPolicyMetadataSchema
>;
