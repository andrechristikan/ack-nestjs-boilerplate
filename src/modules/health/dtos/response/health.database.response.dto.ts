import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import {
    EnumHealthIndicatorStatus,
    EnumHealthStatus,
} from '@modules/health/enums/health.enum';

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
                status: EnumHealthIndicatorStatus.up,
            },
            redis: {
                status: EnumHealthIndicatorStatus.up,
            },
            queue: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'Database indicators that reported down',
        example: {
            database: {
                status: EnumHealthIndicatorStatus.down,
            },
            redis: {
                status: EnumHealthIndicatorStatus.down,
            },
            queue: {
                status: EnumHealthIndicatorStatus.down,
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined database indicator results for this check',
        example: {
            database: {
                status: EnumHealthIndicatorStatus.up,
            },
            redis: {
                status: EnumHealthIndicatorStatus.up,
            },
            queue: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
});

export type HealthDatabaseResponseDto = z.infer<
    typeof HealthDatabaseResponseSchema
>;
