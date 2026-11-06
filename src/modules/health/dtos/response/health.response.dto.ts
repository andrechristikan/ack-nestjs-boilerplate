import { z } from 'zod';
import { HealthIndicatorResultPartialSchema } from '@modules/health/dtos/health.indicator-result-partial.dto';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

/** @public */
export const HealthResponseSchema = z.object({
    status: z.enum(EnumHealthStatus),
    info: HealthIndicatorResultPartialSchema.optional(),
    error: HealthIndicatorResultPartialSchema.optional(),
    details: HealthIndicatorResultSchema,
});

/** @public */
export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;
