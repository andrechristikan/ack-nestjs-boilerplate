import { z } from 'zod';

/**
 * Validates the activity-log metadata of an API key action.
 * @public
 */
export const ActivityLogApiKeyMetadataSchema = z
    .strictObject({
        apiKeyId: z.string(),
        apiKeyName: z.string(),
        apiKeyType: z.string(),
        timestamp: z.union([z.string(), z.date()]),
    })
    .partial();

/**
 * Activity-log metadata of an API key action.
 * @public
 */
export type ActivityLogApiKeyMetadataDto = z.infer<
    typeof ActivityLogApiKeyMetadataSchema
>;
