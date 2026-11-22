import { z } from 'zod';

/** @public */
export const ActivityLogApiKeyMetadataSchema = z.strictObject({
    apiKeyId: z.string().exactOptional(),
    apiKeyName: z.string().exactOptional(),
    apiKeyType: z.string().exactOptional(),
    timestamp: z.union([z.string(), z.date()]).exactOptional(),
});

/** @public */
export type ActivityLogApiKeyMetadataDto = z.infer<
    typeof ActivityLogApiKeyMetadataSchema
>;
