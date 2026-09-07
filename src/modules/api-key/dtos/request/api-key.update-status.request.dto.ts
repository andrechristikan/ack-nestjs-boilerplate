import { z } from 'zod';

export const ApiKeyUpdateStatusRequestSchema = z.strictObject({
    isActive: z.boolean().meta({
        description: 'API Key status',
        example: true,
    }),
});

export type ApiKeyUpdateStatusRequestDto = z.infer<
    typeof ApiKeyUpdateStatusRequestSchema
>;
