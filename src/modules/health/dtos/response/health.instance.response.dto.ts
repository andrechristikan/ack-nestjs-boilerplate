import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import {
    EnumHealthIndicatorStatus,
    EnumHealthStatus,
} from '@modules/health/enums/health.enum';

/** Response shape of the instance health check. */
export const HealthInstanceResponseSchema = HealthResponseSchema.extend({
    status: HealthResponseSchema.shape.status.meta({
        description: 'Overall health status of the checked instance indicators',
        examples: Object.values(EnumHealthStatus),
    }),
    info: HealthResponseSchema.shape.info.meta({
        description: 'Instance indicators that reported up or degraded',
        example: {
            memoryRss: {
                status: EnumHealthIndicatorStatus.up,
            },
            memoryHeap: {
                status: EnumHealthIndicatorStatus.up,
            },
            storage: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'Instance indicators that reported down',
        example: {
            memoryRss: {
                status: EnumHealthIndicatorStatus.down,
            },
            memoryHeap: {
                status: EnumHealthIndicatorStatus.down,
            },
            storage: {
                status: EnumHealthIndicatorStatus.down,
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined instance indicator results for this check',
        example: {
            memoryRss: {
                status: EnumHealthIndicatorStatus.up,
            },
            memoryHeap: {
                status: EnumHealthIndicatorStatus.up,
            },
            storage: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
});

export type HealthInstanceResponseDto = z.infer<
    typeof HealthInstanceResponseSchema
>;
