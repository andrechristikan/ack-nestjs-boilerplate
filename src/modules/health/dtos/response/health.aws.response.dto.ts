import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

/** Response shape of the AWS health check. */
export const HealthAwsResponseSchema = HealthResponseSchema.extend({
    status: HealthResponseSchema.shape.status.meta({
        description: 'Overall health status of the checked AWS indicators',
        examples: Object.values(EnumHealthStatus),
    }),
    info: HealthResponseSchema.shape.info.meta({
        description: 'AWS indicators that reported up or degraded',
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
    error: HealthResponseSchema.shape.error.meta({
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
    details: HealthResponseSchema.shape.details.meta({
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
