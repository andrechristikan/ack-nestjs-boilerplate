import { z } from 'zod';

/**
 * Validates the time window query of an analytics route.
 * @public
 */
export const AnalyticWindowRequestSchema = z.strictObject({
    windowMs: z.coerce.number().int().positive().optional().meta({
        description: 'Lookback window in milliseconds; defaults from config',
        example: 600000,
    }),
});

/**
 * Analytics time window query.
 * @public
 */
export type AnalyticWindowRequestDto = z.infer<
    typeof AnalyticWindowRequestSchema
>;
