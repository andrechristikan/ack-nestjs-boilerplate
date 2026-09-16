import { z } from 'zod';

export const ActivityLogSessionMetadataSchema = z
    .strictObject({
        sessionId: z.string(),
        userId: z.string(),
        userUsername: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

export type ActivityLogSessionMetadataDto = z.infer<
    typeof ActivityLogSessionMetadataSchema
>;
