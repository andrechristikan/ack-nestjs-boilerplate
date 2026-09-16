import { z } from 'zod';

export const ActivityLogUserMetadataSchema = z
    .strictObject({
        userId: z.string(),
        userUsername: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

export type ActivityLogUserMetadataDto = z.infer<
    typeof ActivityLogUserMetadataSchema
>;
