import { z } from 'zod';
import { HealthIndicatorResultSchema } from '@modules/health/dtos/health.indicator-result.dto';

/** Response shape of the third-party health check. */
export const HealthThirdPartyResponseSchema = z.object({
    status: z.enum(['error', 'ok', 'shutting_down']).meta({
        description:
            'Overall health status of the checked third-party indicators',
        examples: ['error', 'ok', 'shutting_down'],
    }),
    info: HealthIndicatorResultSchema.optional().meta({
        description: 'Third-party indicators that reported up',
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
    error: HealthIndicatorResultSchema.optional().meta({
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
    details: HealthIndicatorResultSchema.meta({
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
