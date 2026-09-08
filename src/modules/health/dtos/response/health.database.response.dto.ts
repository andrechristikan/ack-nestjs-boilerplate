import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

/** Response shape of the database health check. */
export const HealthDatabaseResponseSchema = HealthResponseSchema.extend({
    status: HealthResponseSchema.shape.status.meta({
        description: 'Overall health status of the checked database indicators',
        examples: Object.values(EnumHealthStatus),
    }),
    info: HealthResponseSchema.shape.info.meta({
        description: 'Database indicators that reported up or degraded',
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
    error: HealthResponseSchema.shape.error.meta({
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
    details: HealthResponseSchema.shape.details.meta({
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
