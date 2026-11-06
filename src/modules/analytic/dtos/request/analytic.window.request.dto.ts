import { z } from 'zod';

/** @public */
export const AnalyticWindowRequestSchema = z.strictObject({
    windowMs: z.coerce.number().int().positive().optional().meta({
        description:
            'Lookback window in milliseconds; defaults from config and cannot exceed the maximum window',
        example: 600000,
    }),
});

/** @public */
export type AnalyticWindowRequestDto = z.infer<
    typeof AnalyticWindowRequestSchema
>;
