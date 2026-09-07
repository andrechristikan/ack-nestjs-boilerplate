import { z } from 'zod';

/**
 * Terminus indicator map: one entry per checked indicator, each carrying its own status
 * and whatever detail the indicator reported.
 */
export const HealthIndicatorResultSchema = z.record(
    z.string(),
    z.record(z.string(), z.unknown())
);

export type HealthIndicatorResultDto = z.infer<
    typeof HealthIndicatorResultSchema
>;
