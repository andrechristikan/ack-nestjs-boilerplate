import { z } from 'zod';

/**
 * Validates the body for activating or deactivating an API key.
 * @public
 */
export const ApiKeyUpdateStatusRequestSchema = z.strictObject({
    isActive: z.boolean().meta({
        description: 'API Key status',
        example: true,
    }),
});

/**
 * Body for activating or deactivating an API key.
 * @public
 */
export type ApiKeyUpdateStatusRequestDto = z.infer<
    typeof ApiKeyUpdateStatusRequestSchema
>;
