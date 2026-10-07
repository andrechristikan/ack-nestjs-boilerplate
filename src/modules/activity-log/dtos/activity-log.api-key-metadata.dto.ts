import { z } from 'zod';

/**
 * Validates the activity-log metadata of an API key action.
 * @public
 */
export const ActivityLogApiKeyMetadataSchema = z.strictObject({
    apiKeyId: z.string().exactOptional(),
    apiKeyName: z.string().exactOptional(),
    apiKeyType: z.string().exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/**
 * Activity-log metadata of an API key action.
 * @public
 */
export type ActivityLogApiKeyMetadataDto = z.infer<
    typeof ActivityLogApiKeyMetadataSchema
>;
