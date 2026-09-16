import { z } from 'zod';

export const ActivityLogApiKeyMetadataSchema = z
    .strictObject({
        apiKeyId: z.string(),
        apiKeyName: z.string(),
        apiKeyType: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

export type ActivityLogApiKeyMetadataDto = z.infer<
    typeof ActivityLogApiKeyMetadataSchema
>;
