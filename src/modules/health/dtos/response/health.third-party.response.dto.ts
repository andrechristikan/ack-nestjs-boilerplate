import { z } from 'zod';
import { HealthResponseSchema } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';

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
                status: 'up',
            },
            firebase: {
                status: 'up',
            },
            google: {
                status: 'up',
            },
            apple: {
                status: 'up',
            },
            jwksAccessToken: {
                status: 'up',
            },
            jwksRefreshToken: {
                status: 'up',
            },
        },
    }),
    error: HealthResponseSchema.shape.error.meta({
        description: 'Third-party indicators that reported down',
        example: {
            sentry: {
                status: 'down',
            },
            firebase: {
                status: 'down',
            },
            google: {
                status: 'down',
            },
            apple: {
                status: 'down',
            },
            jwksAccessToken: {
                status: 'down',
            },
            jwksRefreshToken: {
                status: 'down',
            },
        },
    }),
    details: HealthResponseSchema.shape.details.meta({
        description: 'Combined third-party indicator results for this check',
        example: {
            sentry: {
                status: 'up',
            },
            firebase: {
                status: 'up',
            },
            google: {
                status: 'up',
            },
            apple: {
                status: 'up',
            },
            jwksAccessToken: {
                status: 'up',
            },
            jwksRefreshToken: {
                status: 'up',
            },
        },
    }),
});

export type HealthThirdPartyResponseDto = z.infer<
    typeof HealthThirdPartyResponseSchema
>;
