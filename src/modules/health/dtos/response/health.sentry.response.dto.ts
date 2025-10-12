import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthThirdPartyResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        example: {
            sentry: {
                status: 'up',
            },
        },
    })
    info?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        example: {
            sentry: {
                status: 'down',
            },
        },
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        example: {
            sentry: {
                status: 'up',
            },
        },
    })
    details: HealthIndicatorResult;
}
