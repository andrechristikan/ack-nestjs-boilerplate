import { z } from 'zod';
import { HealthIndicatorResultPartialSchema } from '@modules/health/dtos/health.indicator-result-partial.dto';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

/**
 * Field list every health check response carries, per route descriptions and examples.
 * @public
 */
export const HealthResponseSchema = z.object({
    status: z.enum(EnumHealthStatus),
    info: HealthIndicatorResultPartialSchema.optional(),
    error: HealthIndicatorResultPartialSchema.optional(),
    details: HealthIndicatorResultSchema,
});

/**
 * Fields every health check result carries.
 * @public
 */
export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;
