import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

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
                status: 'up',
            },
            memoryHeap: {
                status: 'up',
            },
            storage: {
                status: 'up',
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'Instance indicators that reported down',
        example: {
            memoryRss: {
                status: 'down',
            },
            memoryHeap: {
                status: 'down',
            },
            storage: {
                status: 'down',
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined instance indicator results for this check',
        example: {
            memoryRss: {
                status: 'up',
            },
            memoryHeap: {
                status: 'up',
            },
            storage: {
                status: 'up',
            },
        },
    }),
});

export type HealthInstanceResponseDto = z.infer<
    typeof HealthInstanceResponseSchema
>;
