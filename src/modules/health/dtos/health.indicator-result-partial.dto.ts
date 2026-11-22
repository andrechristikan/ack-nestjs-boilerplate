import { z } from 'zod';

/** @public */
export const HealthIndicatorResultPartialSchema = z.record(
    z.string(),
    z.record(z.string(), z.unknown()).optional()
);

/** @public */
export type HealthIndicatorResultPartialDto = z.infer<
    typeof HealthIndicatorResultPartialSchema
>;
