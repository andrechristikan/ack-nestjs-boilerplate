import { z } from 'zod';

/**
 * Shapes a free-form analytics result keyed by string.
 * @public
 */
export const AnalyticJsonResponseSchema = z.record(z.string(), z.unknown());

/**
 * Free-form analytics result.
 * @public
 */
export type AnalyticJsonResponseDto = z.infer<
    typeof AnalyticJsonResponseSchema
>;
