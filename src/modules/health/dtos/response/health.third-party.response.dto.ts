import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthThirdPartyResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
        description:
            'Overall health status of the checked third-party indicators',
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
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
    })
    info?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
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
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
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
    })
    details: HealthIndicatorResult;
}
