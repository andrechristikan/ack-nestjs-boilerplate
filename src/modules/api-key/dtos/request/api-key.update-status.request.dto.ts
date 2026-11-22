import { z } from 'zod';

/** @public */
export const ApiKeyUpdateStatusRequestSchema = z.strictObject({
    isActive: z.boolean().meta({
        description: 'API Key status',
        example: true,
    }),
});

/** @public */
export type ApiKeyUpdateStatusRequestDto = z.infer<
    typeof ApiKeyUpdateStatusRequestSchema
>;
