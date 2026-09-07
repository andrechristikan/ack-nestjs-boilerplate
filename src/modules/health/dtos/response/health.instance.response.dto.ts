import { z } from 'zod';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';

/** Response shape of the instance health check. */
export const HealthInstanceResponseSchema = z.object({
    status: z.enum(['error', 'ok', 'shutting_down']).meta({
        description: 'Overall health status of the checked instance indicators',
        examples: ['error', 'ok', 'shutting_down'],
    }),
    info: HealthIndicatorResultSchema.optional().meta({
        description: 'Instance indicators that reported up',
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
    error: HealthIndicatorResultSchema.optional().meta({
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
    details: HealthIndicatorResultSchema.meta({
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
