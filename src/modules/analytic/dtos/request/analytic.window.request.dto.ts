import { z } from 'zod';

export const AnalyticWindowRequestSchema = z.strictObject({
    windowMs: z.coerce.number().int().positive().optional().meta({
        description: 'Lookback window in milliseconds; defaults from config',
        example: 600000,
    }),
});

export type AnalyticWindowRequestDto = z.infer<
    typeof AnalyticWindowRequestSchema
>;
