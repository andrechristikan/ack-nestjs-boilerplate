import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import {
    EnumHealthIndicatorStatus,
    EnumHealthStatus,
} from '@modules/health/enums/health.enum';

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
                status: EnumHealthIndicatorStatus.up,
            },
            s3PrivateBucket: {
                status: EnumHealthIndicatorStatus.up,
            },
            ses: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'AWS indicators that reported down',
        example: {
            s3PublicBucket: {
                status: EnumHealthIndicatorStatus.down,
            },
            s3PrivateBucket: {
                status: EnumHealthIndicatorStatus.down,
            },
            ses: {
                status: EnumHealthIndicatorStatus.down,
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined AWS indicator results for this check',
        example: {
            s3PublicBucket: {
                status: EnumHealthIndicatorStatus.up,
            },
            s3PrivateBucket: {
                status: EnumHealthIndicatorStatus.up,
            },
            ses: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
});

export type HealthAwsResponseDto = z.infer<typeof HealthAwsResponseSchema>;
