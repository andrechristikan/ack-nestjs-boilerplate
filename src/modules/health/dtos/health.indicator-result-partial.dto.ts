import { z } from 'zod';

/**
 * Terminus indicator map whose entries may be absent: the shape of a check result's `info`
 * and `error`.
 * @public
 */
export const HealthIndicatorResultPartialSchema = z.record(
    z.string(),
    z.record(z.string(), z.unknown()).optional()
);

/**
 * Terminus result map whose entries may be absent, as in `info` and `error`.
 * @public
 */
export type HealthIndicatorResultPartialDto = z.infer<
    typeof HealthIndicatorResultPartialSchema
>;
