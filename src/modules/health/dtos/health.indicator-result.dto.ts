import { z } from 'zod';

/**
 * Terminus indicator map: one entry per checked indicator, each carrying its own status
 * and whatever detail the indicator reported.
 * @public
 */
export const HealthIndicatorResultSchema = z.record(
    z.string(),
    z.record(z.string(), z.unknown())
);

/**
 * Terminus result map keyed by indicator name.
 * @public
 */
export type HealthIndicatorResultDto = z.infer<
    typeof HealthIndicatorResultSchema
>;
