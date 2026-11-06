import { z } from 'zod';

/** @public */
export const HealthIndicatorResultSchema = z.record(
    z.string(),
    z.record(z.string(), z.unknown())
);

/** @public */
export type HealthIndicatorResultDto = z.infer<
    typeof HealthIndicatorResultSchema
>;
