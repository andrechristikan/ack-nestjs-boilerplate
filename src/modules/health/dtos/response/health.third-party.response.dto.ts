import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import {
    EnumHealthIndicatorStatus,
    EnumHealthStatus,
} from '@modules/health/enums/health.enum';

/** Response shape of the third-party health check. */
export const HealthThirdPartyResponseSchema = HealthResponseSchema.extend({
    status: HealthResponseSchema.shape.status.meta({
        description:
            'Overall health status of the checked third-party indicators',
        examples: Object.values(EnumHealthStatus),
    }),
    info: HealthResponseSchema.shape.info.meta({
        description: 'Third-party indicators that reported up or degraded',
        example: {
            sentry: {
                status: EnumHealthIndicatorStatus.up,
            },
            firebase: {
                status: EnumHealthIndicatorStatus.up,
            },
            google: {
                status: EnumHealthIndicatorStatus.up,
            },
            apple: {
                status: EnumHealthIndicatorStatus.up,
            },
            jwksAccessToken: {
                status: EnumHealthIndicatorStatus.up,
            },
            jwksRefreshToken: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'Third-party indicators that reported down',
        example: {
            sentry: {
                status: EnumHealthIndicatorStatus.down,
            },
            firebase: {
                status: EnumHealthIndicatorStatus.down,
            },
            google: {
                status: EnumHealthIndicatorStatus.down,
            },
            apple: {
                status: EnumHealthIndicatorStatus.down,
            },
            jwksAccessToken: {
                status: EnumHealthIndicatorStatus.down,
            },
            jwksRefreshToken: {
                status: EnumHealthIndicatorStatus.down,
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined third-party indicator results for this check',
        example: {
            sentry: {
                status: EnumHealthIndicatorStatus.up,
            },
            firebase: {
                status: EnumHealthIndicatorStatus.up,
            },
            google: {
                status: EnumHealthIndicatorStatus.up,
            },
            apple: {
                status: EnumHealthIndicatorStatus.up,
            },
            jwksAccessToken: {
                status: EnumHealthIndicatorStatus.up,
            },
            jwksRefreshToken: {
                status: EnumHealthIndicatorStatus.up,
            },
        },
    }),
});

export type HealthThirdPartyResponseDto = z.infer<
    typeof HealthThirdPartyResponseSchema
>;
