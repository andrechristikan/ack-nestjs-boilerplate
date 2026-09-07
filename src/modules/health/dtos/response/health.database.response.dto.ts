import { z } from 'zod';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';

/** Response shape of the database health check. */
export const HealthDatabaseResponseSchema = z.object({
    status: z.enum(['error', 'ok', 'shutting_down']).meta({
        description: 'Overall health status of the checked database indicators',
        examples: ['error', 'ok', 'shutting_down'],
    }),
    info: HealthIndicatorResultSchema.optional().meta({
        description: 'Database indicators that reported up',
        example: {
            database: {
                status: 'up',
            },
            redis: {
                status: 'up',
            },
            queue: {
                status: 'up',
            },
        },
    }),
    error: HealthIndicatorResultSchema.optional().meta({
        description: 'Database indicators that reported down',
        example: {
            database: {
                status: 'down',
            },
            redis: {
                status: 'down',
            },
            queue: {
                status: 'down',
            },
        },
    }),
    details: HealthIndicatorResultSchema.meta({
        description: 'Combined database indicator results for this check',
        example: {
            database: {
                status: 'up',
            },
            redis: {
                status: 'up',
            },
            queue: {
                status: 'up',
            },
        },
    }),
});

export type HealthDatabaseResponseDto = z.infer<
    typeof HealthDatabaseResponseSchema
>;
