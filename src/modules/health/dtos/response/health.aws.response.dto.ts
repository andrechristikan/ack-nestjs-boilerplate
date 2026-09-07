import { z } from 'zod';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';

/** Response shape of the AWS health check. */
export const HealthAwsResponseSchema = z.object({
    status: z.enum(['error', 'ok', 'shutting_down']).meta({
        description: 'Overall health status of the checked AWS indicators',
        examples: ['error', 'ok', 'shutting_down'],
    }),
    info: HealthIndicatorResultSchema.optional().meta({
        description: 'AWS indicators that reported up',
        example: {
            s3PublicBucket: {
                status: 'up',
            },
            s3PrivateBucket: {
                status: 'up',
            },
            ses: {
                status: 'up',
            },
        },
    }),
    error: HealthIndicatorResultSchema.optional().meta({
        description: 'AWS indicators that reported down',
        example: {
            s3PublicBucket: {
                status: 'down',
            },
            s3PrivateBucket: {
                status: 'down',
            },
            ses: {
                status: 'down',
            },
        },
    }),
    details: HealthIndicatorResultSchema.meta({
        description: 'Combined AWS indicator results for this check',
        example: {
            s3PublicBucket: {
                status: 'up',
            },
            s3PrivateBucket: {
                status: 'up',
            },
            ses: {
                status: 'up',
            },
        },
    }),
});

export type HealthAwsResponseDto = z.infer<typeof HealthAwsResponseSchema>;
