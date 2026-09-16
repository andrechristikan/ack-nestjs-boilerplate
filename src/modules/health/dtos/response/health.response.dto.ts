import { z } from 'zod';
import {
    HealthIndicatorResultPartialSchema,
    HealthIndicatorResultSchema,
} from '@modules/health/dtos/health.indicator-result.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

/** Field list every health check response carries, per route descriptions and examples. */
export const HealthResponseSchema = z.object({
    status: z.enum(EnumHealthStatus),
    info: HealthIndicatorResultPartialSchema.optional(),
    error: HealthIndicatorResultPartialSchema.optional(),
    details: HealthIndicatorResultSchema,
});

export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;
